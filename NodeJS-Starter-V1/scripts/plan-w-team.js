#!/usr/bin/env node
/**
 * Builder/Validator Task Planning System - Node.js CLI
 * NodeJS-Starter-V1
 * 
 * Cross-platform CLI for generating structured Builder/Validator execution plans
 * 
 * Usage:
 *   node plan-w-team.js "Your task description"
 *   node plan-w-team.js "Your task" --estimates
 *   node plan-w-team.js "Your task" --output ./custom/plan.md
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        task: '',
        output: 'specs/plan.md',
        estimates: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--estimates' || arg === '-e') {
            options.estimates = true;
        } else if (arg === '--output' || arg === '-o') {
            options.output = args[++i];
        } else if (!options.task) {
            options.task = arg;
        }
    }

    return options;
}

// Show help
function showHelp() {
    console.log(`
Builder/Validator Task Planning System v2.0.0
NodeJS-Starter-V1

Usage: node plan-w-team.js [options] "<task description>"

Options:
  -h, --help          Show this help message
  -e, --estimates     Include effort estimates for each task
  -o, --output <path> Output file path (default: specs/plan.md)

Examples:
  node plan-w-team.js "Implement user authentication API"
  node plan-w-team.js "Add dark mode toggle" -e
  node plan-w-team.js "Refactor database layer" -o ./plans/db-refactor.md

Task Types:
  implement, create, add, build  -> 4-phase implementation plan
  refactor, optimize, fix        -> 3-phase refactoring plan
  audit, review, assess          -> 2-phase audit plan
  (default)                      -> 2-phase generic plan
`);
}

// Generate unique task ID
function generateTaskId() {
    return Math.random().toString(36).substring(2, 10);
}

// Get current timestamp
function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Determine phases based on task keywords
function determinePhases(task) {
    const taskLower = task.toLowerCase();
    const phases = [];

    if (taskLower.match(/implement|create|add|build/)) {
        phases.push({
            name: 'Setup & Foundation',
            tasks: [
                { builder: 'Analyze existing codebase structure', validator: 'Verify project structure documented' },
                { builder: 'Create/update necessary directories', validator: 'Verify directories exist with correct permissions' }
            ]
        });
        
        phases.push({
            name: 'Core Implementation',
            tasks: [
                { builder: 'Implement main functionality per requirements', validator: 'Verify code compiles/parses without errors' },
                { builder: 'Add error handling and edge cases', validator: 'Verify error paths tested and working' }
            ]
        });
        
        phases.push({
            name: 'Integration & Testing',
            tasks: [
                { builder: 'Integrate with existing systems', validator: 'Verify integration tests pass' },
                { builder: 'Write/update unit tests', validator: 'Verify test coverage >80% for new code' },
                { builder: 'Run full test suite', validator: 'Verify all tests pass' }
            ]
        });
        
        phases.push({
            name: 'Documentation & Handover',
            tasks: [
                { builder: 'Update README and documentation', validator: 'Verify documentation accuracy' },
                { builder: 'Create deployment/configuration guides', validator: 'Verify guides are complete and tested' }
            ]
        });
    } else if (taskLower.match(/refactor|optimize|improve|fix/)) {
        phases.push({
            name: 'Analysis & Planning',
            tasks: [
                { builder: 'Identify refactoring targets', validator: 'Verify targets documented with rationale' },
                { builder: 'Establish baseline metrics/tests', validator: 'Verify baseline captured and reproducible' }
            ]
        });
        
        phases.push({
            name: 'Refactoring Execution',
            tasks: [
                { builder: 'Execute incremental refactoring', validator: 'Verify each increment passes tests' },
                { builder: 'Update dependent code', validator: 'Verify no breaking changes introduced' }
            ]
        });
        
        phases.push({
            name: 'Validation',
            tasks: [
                { builder: 'Compare before/after metrics', validator: 'Verify improvement targets met' },
                { builder: 'Run regression tests', validator: 'Verify no functionality lost' }
            ]
        });
    } else if (taskLower.match(/audit|review|assess/)) {
        phases.push({
            name: 'Discovery & Analysis',
            tasks: [
                { builder: 'Map current system architecture', validator: 'Verify architecture map complete' },
                { builder: 'Identify issues and risks', validator: 'Verify issues documented with severity' }
            ]
        });
        
        phases.push({
            name: 'Reporting',
            tasks: [
                { builder: 'Create audit report', validator: 'Verify report covers all findings' },
                { builder: 'Prioritize recommendations', validator: 'Verify priorities justified' }
            ]
        });
    } else {
        // Generic fallback
        phases.push({
            name: 'Discovery',
            tasks: [
                { builder: 'Analyze requirements and current state', validator: 'Verify requirements understood and documented' }
            ]
        });
        
        phases.push({
            name: 'Implementation',
            tasks: [
                { builder: 'Execute implementation per requirements', validator: 'Verify implementation meets requirements' },
                { builder: 'Add tests and documentation', validator: 'Verify tests pass and docs are complete' }
            ]
        });
    }

    return phases;
}

// Get effort estimate for a phase
function getEstimate(phaseName) {
    const estimates = {
        'Setup & Foundation': '30m',
        'Core Implementation': '1-2h',
        'Integration & Testing': '1h',
        'Documentation & Handover': '30m',
        'Analysis & Planning': '45m',
        'Refactoring Execution': '1-2h',
        'Validation': '30m',
        'Discovery & Analysis': '1h',
        'Reporting': '45m',
        'Discovery': '45m',
        'Implementation': '1-2h'
    };
    return estimates[phaseName] || 'TBD';
}

// Generate the plan content
function generatePlan(task, options) {
    const taskId = generateTaskId();
    const timestamp = getTimestamp();
    const phases = determinePhases(task);
    
    let content = `# Execution Plan: ${task}\n\n`;
    content += `**Task ID:** ${taskId}\n`;
    content += `**Created:** ${timestamp}\n`;
    content += `**Status:** In Progress\n`;
    content += `**Architecture:** Builder/Validator Pattern\n\n`;
    content += `---\n\n`;
    
    // Team Structure
    content += `## Team Structure\n\n`;
    content += `### Builder Agent\n`;
    content += `- **Role:** Implementation\n`;
    content += `- **Responsibilities:**\n`;
    content += `  - Write code, update configs, edit files\n`;
    content += `  - Follow existing patterns and conventions\n`;
    content += `  - Write clean, documented code\n`;
    content += `  - Update related files (barrel exports, configs)\n\n`;
    
    content += `### Validator Agent\n`;
    content += `- **Role:** Quality Assurance\n`;
    content += `- **Responsibilities:**\n`;
    content += `  - Verify implementation meets requirements\n`;
    content += `  - MUST run immediately after Builder completes\n`;
    content += `  - Check file exists and is readable\n`;
    content += `  - Verify syntax is valid (no parse errors)\n`;
    content += `  - Verify tests pass (if applicable)\n`;
    content += `  - Verify integration works (if applicable)\n\n`;
    
    content += `### Workflow\n`;
    content += `- **Pattern:** Builder → Validator → [Next Builder]\n`;
    content += `- **Rule:** No Builder proceeds without previous Validator passing\n`;
    content += `- **Escalation:** If validation fails 3 times, escalate to human\n\n`;
    content += `---\n\n`;
    
    // Phases
    phases.forEach((phase, phaseIndex) => {
        const phaseNum = phaseIndex + 1;
        content += `## Phase ${phaseNum}: ${phase.name}\n\n`;
        
        phase.tasks.forEach((taskPair, taskIndex) => {
            const taskNum = taskIndex + 1;
            content += `### Phase ${phaseNum}.${taskNum}\n\n`;
            
            if (options.estimates) {
                const estimate = getEstimate(phase.name);
                content += `- [ ] **Builder** [${estimate}]: ${taskPair.builder}\n`;
                content += `  - [ ] **Validator** [15m]: ${taskPair.validator}\n\n`;
            } else {
                content += `- [ ] **Builder**: ${taskPair.builder}\n`;
                content += `  - [ ] **Validator**: ${taskPair.validator}\n\n`;
            }
        });
        
        content += `---\n\n`;
    });
    
    // Completion criteria
    content += `## Completion Criteria\n\n`;
    content += `- [ ] All Builder tasks completed\n`;
    content += `- [ ] All Validator checks passed\n`;
    content += `- [ ] No critical issues remaining\n`;
    content += `- [ ] Documentation updated\n`;
    content += `- [ ] Handover notes created\n\n`;
    
    // Escalation triggers
    content += `## Escalation Triggers\n\n`;
    content += `- Builder fails 3 consecutive attempts → Escalate to human\n`;
    content += `- Validator fails 3 consecutive attempts → Escalate to human\n`;
    content += `- Unclear requirements → Request clarification before proceeding\n`;
    content += `- Breaking changes detected → Pause and assess impact\n\n`;
    
    // Notes
    content += `## Notes\n\n`;
    content += `- Use Australian English (en-AU) for all documentation\n`;
    content += `- Follow existing code patterns and conventions\n`;
    content += `- Ensure Australian compliance (DD/MM/YYYY dates, AUD currency)\n`;
    content += `- All code must pass hooks validation (security, quality, compliance)\n\n`;
    content += `---\n\n`;
    content += `*Generated by plan_w_team v2.0.0*\n`;
    content += `*NodeJS-Starter-V1 Builder/Validator System*\n`;
    
    return {
        content,
        taskId,
        phases: phases.length,
        totalTasks: phases.reduce((sum, p) => sum + p.tasks.length, 0)
    };
}

// Main execution
function main() {
    const options = parseArgs();
    
    if (options.help || !options.task) {
        showHelp();
        process.exit(options.help ? 0 : 1);
    }
    
    console.log('Architecting strict Builder/Validator plan...');
    console.log(`   Task: ${options.task}`);
    console.log(`   Output: ${options.output}`);
    console.log('');
    
    try {
        const plan = generatePlan(options.task, options);
        
        // Create directory if needed
        const outputDir = path.dirname(options.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Created directory: ${outputDir}`);
        }
        
        // Write plan
        fs.writeFileSync(options.output, plan.content, 'utf8');
        
        console.log('Plan generated successfully!');
        console.log(`   Location: ${options.output}`);
        console.log('');
        console.log('Plan Summary:');
        console.log(`   Phases: ${plan.phases}`);
        console.log(`   Task Pairs: ${plan.totalTasks}`);
        console.log('');
        console.log('Next steps:');
        console.log(`   1. Review the plan: code ${options.output}`);
        console.log('   2. Start with Phase 1, Task 1 (Builder)');
        console.log('   3. Complete Validator before moving to next Builder');
        console.log('');
        
        return {
            taskId: plan.taskId,
            outputPath: options.output,
            phases: plan.phases,
            totalTasks: plan.totalTasks
        };
    } catch (error) {
        console.error('Error generating plan:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = { generatePlan, determinePhases };
