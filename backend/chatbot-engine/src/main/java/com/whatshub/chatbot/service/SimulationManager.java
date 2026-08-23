package com.whatshub.chatbot.service;

import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;

@Component
public class SimulationManager {
    private final ThreadLocal<List<String>> capturedMessages = new ThreadLocal<>();
    private final ThreadLocal<String> lastNodeId = new ThreadLocal<>();

    public void startSimulation() {
        capturedMessages.set(new ArrayList<>());
        lastNodeId.set(null);
    }

    public void capture(String message) {
        if (capturedMessages.get() != null) {
            capturedMessages.get().add(message);
        }
    }

    public List<String> getResults() {
        return capturedMessages.get() != null ? capturedMessages.get() : new ArrayList<>();
    }

    public void setActiveNodeId(String nodeId) {
        lastNodeId.set(nodeId);
    }

    public String getActiveNodeId() {
        return lastNodeId.get();
    }

    public void endSimulation() {
        capturedMessages.remove();
        lastNodeId.remove();
    }

    public boolean isSimulating() {
        return capturedMessages.get() != null;
    }
}
