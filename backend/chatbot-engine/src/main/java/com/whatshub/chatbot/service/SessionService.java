package com.whatshub.chatbot.service;

import com.whatshub.chatbot.model.UserSession;
import com.whatshub.chatbot.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {
    private final SessionRepository sessionRepository;

    public Optional<UserSession> findSession(String userId) {
        return sessionRepository.findById(userId);
    }

    public UserSession getOrCreateSession(String userId, UUID flowId) {
        return sessionRepository.findById(userId)
                .orElseGet(() -> {
                    UserSession session = new UserSession();
                    session.setUserId(userId);
                    session.setFlowId(flowId.toString());
                    session.setLastInteractionAt(System.currentTimeMillis());
                    return session;
                });
    }

    public void saveSession(UserSession session) {
        session.setLastInteractionAt(System.currentTimeMillis());
        sessionRepository.save(session);
    }
}
