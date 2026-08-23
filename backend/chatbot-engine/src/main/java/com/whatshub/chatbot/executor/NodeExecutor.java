package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import lombok.AllArgsConstructor;
import lombok.Data;

public interface NodeExecutor {
    NodeResult execute(RFNode node, UserSession session);

    @Data
    @AllArgsConstructor
    class NodeResult {
        private String nextNodeId;
        private boolean waitForInput;

        public static NodeResult next(String nextNodeId) {
            return new NodeResult(nextNodeId, false);
        }

        public static NodeResult waitInput() {
            return new NodeResult(null, true);
        }

        /** Terminates traversal of the current flow (used after a cross-flow jump). */
        public static NodeResult end() {
            return new NodeResult(null, false);
        }
    }
}

