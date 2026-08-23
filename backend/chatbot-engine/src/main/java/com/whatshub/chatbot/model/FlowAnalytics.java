package com.whatshub.chatbot.model;

import lombok.Data;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "flow_analytics")
public class FlowAnalytics {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "flow_id", nullable = false)
    private UUID flowId;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    @Column(nullable = false)
    private int hits = 0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flow_id", insertable = false, updatable = false)
    private Flow flow;
}
