package com.whatshub.chatbot.executor;

import com.whatshub.chatbot.model.RFNode;
import com.whatshub.chatbot.model.UserSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Component("KEYWORD_ROUTER_EXECUTOR")
public class KeywordRouterExecutor implements NodeExecutor {

    @Override
    public NodeResult execute(RFNode node, UserSession session) {
        // Wait for user input if we haven't received it yet for this node
        Object rawInput = session.getVariables().remove("_last_user_message");
        if (rawInput == null) {
            return NodeResult.waitInput();
        }

        String input = String.valueOf(rawInput).trim().toLowerCase();
        log.info("KEYWORD_ROUTER evaluating input: '{}'", input);

        Object configObj = node.getData().getConfig();
        if (configObj instanceof Map<?, ?> configMap) {
            Object rulesObj = configMap.get("rules");
            if (rulesObj instanceof List<?> rules) {
                for (int i = 0; i < rules.size(); i++) {
                    Object r = rules.get(i);
                    if (r instanceof Map<?, ?> ruleMap) {
                        String type = (String) ruleMap.get("type"); // "exact", "contains", "regex"
                        String keywordsStr = (String) ruleMap.get("keywords");

                        if (keywordsStr != null && !keywordsStr.isBlank()) {
                            boolean matched = false;
                            String[] keywords = keywordsStr.split(",");

                            for (String kw : keywords) {
                                String cleanKw = kw.trim().toLowerCase();
                                if ("exact".equals(type) && input.equals(cleanKw)) {
                                    matched = true;
                                } else if ("contains".equals(type) && input.contains(cleanKw)) {
                                    matched = true;
                                } else if ("regex".equals(type)) {
                                    try {
                                        if (Pattern.compile(cleanKw, Pattern.CASE_INSENSITIVE).matcher(input).find()) {
                                            matched = true;
                                        }
                                    } catch (Exception ignore) {}
                                }

                                if (matched) break;
                            }

                            if (matched) {
                                log.info("Matched rule index {}, mapping to branch 'rule-{}'", i, i);
                                session.getVariables().put("_last_branch_handle", "rule-" + i);
                                return NodeResult.next(null);
                            }
                        }
                    }
                }
            }
        }

        // If no rules matched, take the fallback branch
        log.info("No keyword rules matched. Taking fallback branch.");
        session.getVariables().put("_last_branch_handle", "fallback");
        return NodeResult.next(null);
    }
}
