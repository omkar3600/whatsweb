package com.whatshub.chatbot.repository;

import com.whatshub.chatbot.model.Flow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface FlowRepository extends JpaRepository<Flow, UUID> {
}
