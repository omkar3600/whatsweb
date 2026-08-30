package com.whatsweb.chatbot.repository;

import com.whatsweb.chatbot.model.UserSession;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionRepository extends CrudRepository<UserSession, String> {
}
