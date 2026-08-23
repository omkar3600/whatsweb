package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Random;

@Component("AB_TEST_EXECUTOR")
@RequiredArgsConstructor
@Slf4j
public class AbTestNodeExecutor implements NodeExecutor {

    private final Random random = new Random();

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        Map<String, Object> config = node.getData().getConfig();
        int splitA = config != null && config.containsKey("splitA") 
                ? Integer.parseInt(config.get("splitA").toString()) 
                : 50;
        
        // Random number from 1 to 100
        int roll = random.nextInt(100) + 1;
        
        String branch = roll <= splitA ? "a" : "b";
        
        log.info("Executing AB_TEST node for user: {}. SplitA: {}%, Rolled: {}, Routing to Branch: {}", 
                session.getUserId(), splitA, roll, branch.toUpperCase());
        
        // Return null for nextNodeId to let FlowEngine resolve the edge matching the handle (branch "a" or "b")
        // Note: The input parameter passed to findNextNodeId will need to be the branch
        // For logic nodes that auto-route, we can pass the handle as the "input" simulation to edge matcher
        
        // We will simulate the handle output by passing it as "input" to the process. 
        // This requires FlowEngine to use the sourceHandle. For simplicity, we can set session context or let FlowEngine handle it.
        // NodeResult doesn't currently support passing the branch handle out. Let's update FlowEngine later if needed,
        // or just return the branch string and let FlowEngine resolve it.
        // Returning standard waitInput or next prevents branch passing.
        
        session.getVariables().put("_last_branch_handle", branch); 
        return NodeResult.next(null);
    }
}
