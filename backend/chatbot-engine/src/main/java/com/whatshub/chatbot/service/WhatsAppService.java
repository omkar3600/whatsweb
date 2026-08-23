package com.whatshub.chatbot.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WhatsAppService {
    private final SimulationManager simulationManager;

    public void sendMessage(String to, String content) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture(content);
        }
        // Implementation for Meta Cloud API or BSP API
        System.out.println("DEBUG: Sending WhatsApp message to " + to + " Content: " + content);
    }
    
    public void sendButtons(String to, String text, java.util.List<String> buttons) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture(text + " [Buttons: " + String.join(", ", buttons) + "]");
        }
        System.out.println("DEBUG: Sending Buttons to " + to + " Text: " + text + " Buttons: " + buttons);
    }

    public void sendForm(String to, String formTitle, java.util.Map<String, Object> formConfig) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture("Form: " + formTitle);
        }
        System.out.println("DEBUG: Sending WhatsApp Native Form to " + to + " Title: " + formTitle);
    }

    public void sendWebview(String to, String buttonText, String url) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture("Webview: " + buttonText + " (" + url + ")");
        }
        System.out.println("DEBUG: Sending WhatsApp Webview Button to " + to + " Button: " + buttonText + " URL: " + url);
    }

    public void sendPaymentRequest(String to, String amount, String currency, String referenceId) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture("Payment Request: " + currency + " " + amount);
        }
        System.out.println("DEBUG: Sending WhatsApp Payment Request to " + to + " Amount: " + currency + " " + amount + " Ref: " + referenceId);
    }

    public void routeToAgent(String userId, String department, String message) {
        if (simulationManager.isSimulating()) {
            simulationManager.capture("Routing to Agent: " + department + " | " + message);
        }
        System.out.println("DEBUG: Routing user " + userId + " to Agent Department [" + department + "] | Reason: " + message);
    }
}
