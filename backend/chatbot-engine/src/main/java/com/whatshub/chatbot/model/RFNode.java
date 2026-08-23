package com.whatshub.chatbot.model;

import lombok.Data;
import java.util.Map;

@Data
public class RFNode {
    private String id;
    private String type; // 'content', 'logic', 'integration'
    private NodeData data;
    private Position position;

    @Data
    public static class NodeData {
        private String type; // 'TEXT', 'IMAGE', 'BUTTON', 'CONDITION', 'API'
        private String label;
        private String content;
        private Map<String, Object> config;
    }

    @Data
    public static class Position {
        private double x;
        private double y;
    }
}
