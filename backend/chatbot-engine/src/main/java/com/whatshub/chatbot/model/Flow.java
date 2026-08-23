package com.whatshub.chatbot.model;

import lombok.Data;
import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@Entity
@Table(name = "flows")
public class Flow {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String name;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private FlowDefinition definition;
    
    private boolean active = true;

    /**
     * Keyword(s) that trigger this flow. Comma-separated for multiple keywords.
     * e.g. "support, help, agent"
     * Case-insensitive match is performed at runtime.
     */
    @Column(name = "trigger_keyword")
    private String triggerKeyword;

    /**
     * If true, this flow acts as the default fallback when no keyword matches.
     * Only one flow should have this set to true.
     */
    @Column(name = "is_default_flow")
    private boolean defaultFlow = false;
}
