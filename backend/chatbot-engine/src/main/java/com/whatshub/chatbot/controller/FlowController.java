package com.whatshub.chatbot.controller;

import com.whatshub.chatbot.model.Flow;
import com.whatshub.chatbot.model.FlowDefinition;
import com.whatshub.chatbot.repository.FlowRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/flows")
@RequiredArgsConstructor
public class FlowController {
    private final FlowRepository flowRepository;

    @GetMapping
    public List<Flow> getAll() {
        return flowRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Flow> getById(@PathVariable UUID id) {
        return flowRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Flow create(@RequestBody Flow flow) {
        return flowRepository.save(flow);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Flow> update(@PathVariable UUID id, @RequestBody Flow updated) {
        return flowRepository.findById(id)
            .map(flow -> {
                if (updated.getName() != null) flow.setName(updated.getName());
                if (updated.getDefinition() != null) flow.setDefinition(updated.getDefinition());
                flow.setActive(updated.isActive());
                flow.setDefaultFlow(updated.isDefaultFlow());
                if (updated.getTriggerKeyword() != null) flow.setTriggerKeyword(updated.getTriggerKeyword());
                return ResponseEntity.ok(flowRepository.save(flow));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lightweight PATCH to update just the trigger keyword and default-flow settings.
     * Body: { "triggerKeyword": "help, support", "defaultFlow": false }
     */
    @PatchMapping("/{id}/settings")
    public ResponseEntity<Flow> updateSettings(@PathVariable UUID id, @RequestBody Map<String, Object> settings) {
        return flowRepository.findById(id)
            .map(flow -> {
                if (settings.containsKey("triggerKeyword")) {
                    flow.setTriggerKeyword((String) settings.get("triggerKeyword"));
                }
                if (settings.containsKey("defaultFlow")) {
                    flow.setDefaultFlow((Boolean) settings.get("defaultFlow"));
                }
                if (settings.containsKey("name")) {
                    flow.setName((String) settings.get("name"));
                }
                if (settings.containsKey("active")) {
                    flow.setActive((Boolean) settings.get("active"));
                }
                return ResponseEntity.ok(flowRepository.save(flow));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/save")
    public Flow saveDefinition(@PathVariable UUID id, @RequestBody FlowDefinition definition) {
        return flowRepository.findById(id)
            .map(flow -> {
                flow.setDefinition(definition);
                return flowRepository.save(flow);
            })
            .orElseGet(() -> {
                Flow newFlow = new Flow();
                newFlow.setId(id);
                newFlow.setDefinition(definition);
                newFlow.setActive(true);
                return flowRepository.save(newFlow);
            });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!flowRepository.existsById(id)) return ResponseEntity.notFound().build();
        flowRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
