package com.example.doctorappointment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    public String analyzeSymptoms(String symptoms) {
        if ("your-openai-api-key-here".equals(apiKey)) {
            log.warn("Using dummy OpenAI API key. Returning mock response.");
            return "{\"recommendation\": \"This is a mock recommendation because the API key is not configured. Based on your symptoms, you might need a general checkup.\", \"specialization\": \"General Practitioner\"}";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> messageSystem = new HashMap<>();
        messageSystem.put("role", "system");
        messageSystem.put("content", "You are a medical triage assistant. Analyze symptoms and strictly output JSON with exactly two keys: 'recommendation' (a brief explanation) and 'specialization' (the exact suggested medical specialization, e.g., 'Cardiologist', 'Neurologist', 'General Practitioner', etc.). Do not include any markdown formatting or extra text outside the JSON.");

        Map<String, Object> messageUser = new HashMap<>();
        messageUser.put("role", "user");
        messageUser.put("content", symptoms);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-3.5-turbo");
        requestBody.put("messages", List.of(messageSystem, messageUser));
        requestBody.put("temperature", 0.3);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(OPENAI_URL, request, String.class);
            JsonNode rootNode = objectMapper.readTree(response);
            return rootNode.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Failed to call OpenAI API", e);
            throw new RuntimeException("AI processing failed. Please try again later.");
        }
    }
}
