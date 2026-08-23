package com.whatshub.chatbot.repository;

import com.whatshub.chatbot.model.FlowAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlowAnalyticsRepository extends JpaRepository<FlowAnalytics, UUID> {
    Optional<FlowAnalytics> findByFlowIdAndNodeId(UUID flowId, String nodeId);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO flow_analytics (id, flow_id, node_id, hits, updated_at) " +
                   "VALUES (gen_random_uuid(), :flowId, :nodeId, 1, now()) " +
                   "ON CONFLICT (flow_id, node_id) DO UPDATE " +
                   "SET hits = flow_analytics.hits + 1, updated_at = now()", nativeQuery = true)
    void incrementHits(@Param("flowId") UUID flowId, @Param("nodeId") String nodeId);
}
