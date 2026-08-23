package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.service.FlowEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component("JUMP_EXECUTOR")
@Slf4j
public class JumpNodeExecutor implements NodeExecutor {

    private final FlowEngine flowEngine;

    // @Lazy to avoid circular dependency: FlowEngine -> JumpNodeExecutor -> FlowEngine
    public JumpNodeExecutor(@Lazy FlowEngine flowEngine) {
        this.flowEngine = flowEngine;
    }

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Object cfg = node.getData().getConfig();
        if (cfg instanceof java.util.Map<?, ?> configMap) {
            Object targetFlowId = configMap.get("targetFlowId");
            if (targetFlowId instanceof String targetId && !targetId.isBlank()) {
                log.info("JUMP node: routing user '{}' to flow '{}'", session.getUserId(), targetId);
                // Jump to the target flow. This is async in nature — the current flow
                // chain ends and a new chain starts from the target flow's START node.
                flowEngine.jumpToFlow(session.getUserId(), targetId);
                // Signal that we don't need to continue the current flow's edge traversal.
                return NodeResult.end();
            }
        }
        log.warn("JUMP node missing 'targetFlowId' in config, skipping jump.");
        return NodeResult.next(null);
    }
}
