package com.whatshub.chatbot.service;

import com.whatshub.chatbot.executor.NodeExecutor;
import com.whatshub.chatbot.model.*;
import com.whatshub.chatbot.repository.FlowAnalyticsRepository;
import com.whatshub.chatbot.repository.FlowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlowEngine {
    private final Map<String, NodeExecutor> executors;
    private final SessionService sessionService;
    private final FlowRepository flowRepository;
    private final FlowAnalyticsRepository analyticsRepository;
    private final SimulationManager simulationManager;

    /**
     * Main entry point called by the WhatsApp message handler.
     * 
     * Resolution order:
     * 1. If the user already has an active session for a flow, continue that flow with the input.
     * 2. If the input matches a trigger keyword of any active flow, start that flow.
     * 3. If a default flow exists, start it.
     * 4. Do nothing.
     */
    public void proceed(String userId, String input) {
        List<Flow> activeFlows = flowRepository.findAll().stream()
            .filter(Flow::isActive)
            .toList();

        // 1. Check for existing session
        Optional<UserSession> existingSession = sessionService.findSession(userId);
        if (existingSession.isPresent()) {
            UserSession session = existingSession.get();
            // Make sure the flow still exists and is active
            boolean flowStillActive = activeFlows.stream()
                .anyMatch(f -> f.getId().toString().equals(session.getFlowId()));
            if (flowStillActive) {
                activeFlows.stream()
                    .filter(f -> f.getId().toString().equals(session.getFlowId()))
                    .findFirst()
                    .ifPresent(flow -> engage(userId, input, flow));
                return;
            }
        }

        // 2. Match trigger keyword — supports comma-separated keywords per flow, case-insensitive
        Optional<Flow> keywordMatch = activeFlows.stream()
            .filter(f -> f.getTriggerKeyword() != null && !f.getTriggerKeyword().isBlank())
            .filter(f -> Arrays.stream(f.getTriggerKeyword().split(","))
                .map(String::trim)
                .anyMatch(kw -> kw.equalsIgnoreCase(input.trim())))
            .findFirst();

        if (keywordMatch.isPresent()) {
            engage(userId, input, keywordMatch.get());
            return;
        }

        // 3. Match KEYWORD_ROUTER rules inside flows dynamically
        Optional<Flow> routerMatch = activeFlows.stream()
            .filter(f -> matchesKeywordRouterNode(f, input))
            .findFirst();

        if (routerMatch.isPresent()) {
            engage(userId, input, routerMatch.get());
            return;
        }

        // 4. Fallback to default flow
        activeFlows.stream()
            .filter(Flow::isDefaultFlow)
            .findFirst()
            .ifPresent(flow -> engage(userId, input, flow));
    }

    public void engage(String userId, String input, Flow flow) {
        UserSession session = sessionService.getOrCreateSession(userId, flow.getId());
        FlowDefinition definition = flow.getDefinition();
        
        // Save the raw input for any node that might need it (e.g. KEYWORD_ROUTER)
        if (input != null && !input.isBlank()) {
            session.getVariables().put("_last_user_message", input);
        }

        String currentNodeId = session.getCurrentNodeId();
        if (currentNodeId == null) {
            // Find start node in React Flow graph
            currentNodeId = findRootNodeId(definition);
        } else {
            // If we're waiting for input, the input belongs to the CURRENT node
            RFNode previousNode = findNode(currentNodeId, definition);
            if (previousNode != null && "QUESTION".equals(previousNode.getData().getType())) {
                Object configObj = previousNode.getData().getConfig();
                if (configObj instanceof Map map) {
                    Object saveAs = map.get("saveAs");
                    if (saveAs != null && !saveAs.toString().isBlank()) {
                        session.getVariables().put(saveAs.toString(), input);
                        log.info("Saved user answer to variable: {}", saveAs);
                    }
                }
            }

            // and we need to resolve the transition to the NEXT node.
            currentNodeId = findNextNodeId(currentNodeId, definition, input);
        }

        if (currentNodeId != null) {
            processNode(currentNodeId, session, definition);
        }
    }

    /**
     * Jump to a different flow entirely — called by JumpNodeExecutor.
     * Resets the session to point to the new flow and starts it from the START node.
     */
    public void jumpToFlow(String userId, String targetFlowId) {
        Optional<Flow> targetFlowOpt = flowRepository.findAll().stream()
            .filter(f -> f.getId().toString().equals(targetFlowId) && f.isActive())
            .findFirst();

        if (targetFlowOpt.isEmpty()) {
            log.warn("JumpToFlow: target flow '{}' not found or inactive.", targetFlowId);
            return;
        }

        Flow targetFlow = targetFlowOpt.get();
        FlowDefinition definition = targetFlow.getDefinition();

        // Reset session to target flow
        UserSession session = sessionService.getOrCreateSession(userId, targetFlow.getId());
        session.setFlowId(targetFlow.getId().toString());
        session.setCurrentNodeId(null); // Will be resolved to START node
        sessionService.saveSession(session);

        log.info("User '{}' jumping to flow '{}'", userId, targetFlow.getName());

        String startNodeId = findRootNodeId(definition);

        processNode(startNodeId, session, definition);
    }

    private void processNode(String nodeId, UserSession session, FlowDefinition definition) {
        RFNode node = findNode(nodeId, definition);
        if (node == null) return;

        // Track Simulation State
        if (simulationManager.isSimulating()) {
            simulationManager.setActiveNodeId(nodeId);
        }

        // Track Analytics
        try {
            analyticsRepository.incrementHits(UUID.fromString(session.getFlowId()), nodeId);
        } catch (Exception e) {
            log.error("Failed to track flow analytics: {}", e.getMessage());
        }

        session.setCurrentNodeId(nodeId);
        sessionService.saveSession(session);

        String type = node.getData().getType();
        String executorType = type + "_EXECUTOR";
        NodeExecutor executor = executors.get(executorType);
        
        if (executor != null) {
            NodeExecutor.NodeResult result = executor.execute(node, session);
            
            if (!result.isWaitForInput()) {
                String nextId = result.getNextNodeId();
                if (nextId == null) {
                    // Check if executor set a branch handle to force a specific path
                    String branchHandle = (String) session.getVariables().remove("_last_branch_handle");
                    nextId = findNextNodeId(nodeId, definition, branchHandle);
                }
                
                if (nextId != null) {
                    processNode(nextId, session, definition);
                }
            } else {
                log.info("System waiting for user input at node: {}", nodeId);
            }
        } else {
            log.error("No executor found for type: {}", executorType);
        }
    }

    private RFNode findNode(String id, FlowDefinition def) {
        return def.getNodes().stream().filter(n -> n.getId().equals(id)).findFirst().orElse(null);
    }

    private String findNextNodeId(String sourceId, FlowDefinition def, String input) {
        return def.getEdges().stream()
            .filter(e -> e.getSource().equals(sourceId))
            .filter(e -> input == null || matchEdge(e, input, def))
            .findFirst()
            .map(RFEdge::getTarget)
            .orElse(null);
    }

    private boolean matchEdge(RFEdge edge, String input, FlowDefinition def) {
        if (edge.getSourceHandle() != null) {
            return input.equalsIgnoreCase(edge.getSourceHandle());
        }
        return true; 
    }

    private String findRootNodeId(FlowDefinition definition) {
        return definition.getNodes().stream()
            .filter(n -> "START".equals(n.getData().getType()))
            .findFirst()
            .map(RFNode::getId)
            .orElseGet(() -> {
                java.util.Set<String> targetIds = definition.getEdges().stream()
                    .map(RFEdge::getTarget)
                    .collect(Collectors.toSet());
                return definition.getNodes().stream()
                    .filter(n -> !targetIds.contains(n.getId()))
                    .findFirst()
                    .map(RFNode::getId)
                    .orElse(definition.getNodes().get(0).getId());
            });
    }

    private boolean matchesKeywordRouterNode(Flow flow, String input) {
        if (input == null || input.isBlank()) return false;
        String lowerInput = input.trim().toLowerCase();

        for (RFNode node : flow.getDefinition().getNodes()) {
            if ("KEYWORD_ROUTER".equals(node.getData().getType())) {
                Object configObj = node.getData().getConfig();
                if (configObj instanceof Map map) {
                    Object rulesObj = map.get("rules");
                    if (rulesObj instanceof List rules) {
                        for (Object r : rules) {
                            if (r instanceof Map ruleMap) {
                                String type = (String) ruleMap.get("type");
                                String keywordsStr = (String) ruleMap.get("keywords");

                                if (keywordsStr != null && !keywordsStr.isBlank()) {
                                    String[] keywords = keywordsStr.split(",");
                                    for (String kw : keywords) {
                                        String cleanKw = kw.trim().toLowerCase();
                                        if ("exact".equals(type) && lowerInput.equals(cleanKw)) {
                                            return true;
                                        } else if ("contains".equals(type) && lowerInput.contains(cleanKw)) {
                                            return true;
                                        } else if ("regex".equals(type)) {
                                            try {
                                                if (java.util.regex.Pattern.compile(cleanKw, java.util.regex.Pattern.CASE_INSENSITIVE).matcher(lowerInput).find()) {
                                                    return true;
                                                }
                                            } catch (Exception ignore) {}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
}
