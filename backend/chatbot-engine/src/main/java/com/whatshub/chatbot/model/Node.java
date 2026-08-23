package com.whatshub.chatbot.model;

import lombok.Data;
import java.util.Map;
import java.util.List;

@Data
public class Node {
    private String id;
    private NodeType type;
    private String content; // Message text or template name
    private List<String> buttons;
    private Map<String, String> next; // For buttons/choices: { "Button Text": "NextNodeId" }
    private String defaultNext; // For linear nodes like MESSAGE or API_CALL
    
    // API Call specifics
    private String url;
    private String method;
    private Map<String, String> headers;
    private Map<String, String> responseMapping; // { "$.path.to.data": "var_name" }
    
    // Condition specifics
    private List<Condition> conditions;
}

enum NodeType {
    MESSAGE, QUESTION, BUTTON, CONDITION, API_CALL, DELAY
}

@Data
class Condition {
    private String variable;
    private String operator; // EQUALS, CONTAINS, GT, LT
    private String value;
    private String nextNodeId;
}
