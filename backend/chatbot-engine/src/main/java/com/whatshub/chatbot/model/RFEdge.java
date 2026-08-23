package com.whatshub.chatbot.model;

import lombok.Data;

@Data
public class RFEdge {
    private String id;
    private String source;
    private String target;
    private String sourceHandle;
    private String targetHandle;
}
