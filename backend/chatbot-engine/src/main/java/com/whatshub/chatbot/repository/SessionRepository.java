package com.whatshub.chatbot.repository;

import com.whatshub.chatbot.model.UserSession;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionRepository extends CrudRepository<UserSession, String> {
}
