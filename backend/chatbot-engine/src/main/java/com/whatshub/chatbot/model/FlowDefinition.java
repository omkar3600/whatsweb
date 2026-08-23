package com.whatshub.chatbot.model;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class FlowDefinition {
    private List<RFNode> nodes;
    private List<RFEdge> edges;
    private Map<String, Object> globalVariables;
}
