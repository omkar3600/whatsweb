package com.whatsweb.chatbot.controller;

import com.whatsweb.chatbot.model.Flow;
import com.whatsweb.chatbot.model.FlowDefinition;
import com.whatsweb.chatbot.service.FlowEngine;
import com.whatsweb.chatbot.service.SimulationManager;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot/simulate")
@RequiredArgsConstructor
public class FlowSimulationController {
    private final FlowEngine flowEngine;
    private final SimulationManager simulationManager;

    @PostMapping("/{flowId}")
    public SimulationResponse simulate(@PathVariable String flowId, @RequestBody SimulationRequest request) {
        simulationManager.startSimulation();
        
        // Reset session for simulator to ensure a fresh start
        com.whatsweb.chatbot.model.UserSession session = sessionService.getOrCreateSession("simulator-user", java.util.UUID.fromString(flowId));
        session.setCurrentNode(null);
        session.setVariables(new java.util.HashMap<>());
        sessionService.saveSession(session);
        
        try {
            Flow flow = new Flow();
            flow.setId(java.util.UUID.fromString(flowId));
            flow.setName("Simulation Mode");
            
            FlowDefinition definition = new FlowDefinition();
            definition.setNodes(request.getNodes());
            definition.setEdges(request.getEdges());
            flow.setDefinition(definition);

            // Trigger the engine logic
            flowEngine.engage("simulator-user", request.getInput(), flow);

            List<BotResponse> responses = simulationManager.getResults().stream()
                .map(content -> new BotResponse(content, "TEXT"))
                .collect(Collectors.toList());

            return new SimulationResponse(responses, simulationManager.getActiveNodeId());
        } finally {
            simulationManager.endSimulation();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationRequest {
        private String input;
        private List<com.whatsweb.chatbot.model.RFNode> nodes;
        private List<com.whatsweb.chatbot.model.RFEdge> edges;
    }

    @Data
    @AllArgsConstructor
    public static class SimulationResponse {
        private List<BotResponse> responses;
        private String activeNodeId;
    }

    @Data
    @AllArgsConstructor
    public static class BotResponse {
        private String content;
        private String type;
    }
}
