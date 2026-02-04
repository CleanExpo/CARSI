#Requires -Version 5.1
<#
.SYNOPSIS
    Builder/Validator Task Planning System for NodeJS-Starter-V1
.DESCRIPTION
    Generates structured execution plans with strict Builder/Validator pairing.
    Ensures every implementation task has a corresponding validation task.
.NOTES
    Version: 2.0.0
    Author: NodeJS-Starter-V1 Team
    Date: 2025-02-04
#>

function plan_w_team {
    <#
    .SYNOPSIS
        Generate a structured Builder/Validator execution plan.
    .PARAMETER Task
        The high-level task to decompose into atomic Builder/Validator units.
    .PARAMETER OutputPath
        Path for the generated plan file (default: specs/plan.md).
    .PARAMETER IncludeEstimates
        Include effort estimates for each task.
    .EXAMPLE
        plan_w_team -Task "Implement user authentication API"
    .EXAMPLE
        plan_w_team -Task "Add dark mode toggle" -IncludeEstimates
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true, Position=0)]
        [string]$Task,
        
        [Parameter(Mandatory=$false)]
        [string]$OutputPath = "specs/plan.md",
        
        [Parameter(Mandatory=$false)]
        [switch]$IncludeEstimates
    )

    # Generate timestamp and task ID
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $TaskId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
    
    Write-Host "Architecting strict Builder/Validator plan..." -ForegroundColor Cyan
    Write-Host "   Task: $Task" -ForegroundColor Gray
    Write-Host "   Output: $OutputPath" -ForegroundColor Gray
    Write-Host ""

    # Initialize phases array
    $Phases = @()
    
    # Phase detection based on task keywords
    if ($Task -match "implement|create|add|build") {
        $Phases += @{
            Name = "Setup & Foundation"
            Tasks = @(
                @{ Builder = "Analyze existing codebase structure"; Validator = "Verify project structure documented" },
                @{ Builder = "Create/update necessary directories"; Validator = "Verify directories exist with correct permissions" }
            )
        }
        
        $Phases += @{
            Name = "Core Implementation"
            Tasks = @(
                @{ Builder = "Implement main functionality per requirements"; Validator = "Verify code compiles/parses without errors" },
                @{ Builder = "Add error handling and edge cases"; Validator = "Verify error paths tested and working" }
            )
        }
        
        $Phases += @{
            Name = "Integration & Testing"
            Tasks = @(
                @{ Builder = "Integrate with existing systems"; Validator = "Verify integration tests pass" },
                @{ Builder = "Write/update unit tests"; Validator = "Verify test coverage >80% for new code" },
                @{ Builder = "Run full test suite"; Validator = "Verify all tests pass" }
            )
        }
        
        $Phases += @{
            Name = "Documentation & Handover"
            Tasks = @(
                @{ Builder = "Update README and documentation"; Validator = "Verify documentation accuracy" },
                @{ Builder = "Create deployment/configuration guides"; Validator = "Verify guides are complete and tested" }
            )
        }
    }
    elseif ($Task -match "refactor|optimize|improve|fix") {
        $Phases += @{
            Name = "Analysis & Planning"
            Tasks = @(
                @{ Builder = "Identify refactoring targets"; Validator = "Verify targets documented with rationale" },
                @{ Builder = "Establish baseline metrics/tests"; Validator = "Verify baseline captured and reproducible" }
            )
        }
        
        $Phases += @{
            Name = "Refactoring Execution"
            Tasks = @(
                @{ Builder = "Execute incremental refactoring"; Validator = "Verify each increment passes tests" },
                @{ Builder = "Update dependent code"; Validator = "Verify no breaking changes introduced" }
            )
        }
        
        $Phases += @{
            Name = "Validation"
            Tasks = @(
                @{ Builder = "Compare before/after metrics"; Validator = "Verify improvement targets met" },
                @{ Builder = "Run regression tests"; Validator = "Verify no functionality lost" }
            )
        }
    }
    elseif ($Task -match "audit|review|assess") {
        $Phases += @{
            Name = "Discovery & Analysis"
            Tasks = @(
                @{ Builder = "Map current system architecture"; Validator = "Verify architecture map complete" },
                @{ Builder = "Identify issues and risks"; Validator = "Verify issues documented with severity" }
            )
        }
        
        $Phases += @{
            Name = "Reporting"
            Tasks = @(
                @{ Builder = "Create audit report"; Validator = "Verify report covers all findings" },
                @{ Builder = "Prioritize recommendations"; Validator = "Verify priorities justified" }
            )
        }
    }
    else {
        # Generic fallback for unknown task types
        $Phases += @{
            Name = "Discovery"
            Tasks = @(
                @{ Builder = "Analyze requirements and current state"; Validator = "Verify requirements understood and documented" }
            )
        }
        
        $Phases += @{
            Name = "Implementation"
            Tasks = @(
                @{ Builder = "Execute implementation per requirements"; Validator = "Verify implementation meets requirements" },
                @{ Builder = "Add tests and documentation"; Validator = "Verify tests pass and docs are complete" }
            )
        }
    }

    # Build plan content using StringBuilder for efficiency
    $PlanContent = New-Object System.Text.StringBuilder
    
    # Header
    [void]$PlanContent.AppendLine("# Execution Plan: $Task")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("**Task ID:** $TaskId")
    [void]$PlanContent.AppendLine("**Created:** $Timestamp")
    [void]$PlanContent.AppendLine("**Status:** In Progress")
    [void]$PlanContent.AppendLine("**Architecture:** Builder/Validator Pattern")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("---")
    [void]$PlanContent.AppendLine("")
    
    # Architecture section
    [void]$PlanContent.AppendLine("## Team Structure")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("### Builder Agent")
    [void]$PlanContent.AppendLine("- **Role:** Implementation")
    [void]$PlanContent.AppendLine("- **Responsibilities:**")
    [void]$PlanContent.AppendLine("  - Write code, update configs, edit files")
    [void]$PlanContent.AppendLine("  - Follow existing patterns and conventions")
    [void]$PlanContent.AppendLine("  - Write clean, documented code")
    [void]$PlanContent.AppendLine("  - Update related files (barrel exports, configs)")
    [void]$PlanContent.AppendLine("")
    
    [void]$PlanContent.AppendLine("### Validator Agent")
    [void]$PlanContent.AppendLine("- **Role:** Quality Assurance")
    [void]$PlanContent.AppendLine("- **Responsibilities:**")
    [void]$PlanContent.AppendLine("  - Verify implementation meets requirements")
    [void]$PlanContent.AppendLine("  - MUST run immediately after Builder completes")
    [void]$PlanContent.AppendLine("  - Check file exists and is readable")
    [void]$PlanContent.AppendLine("  - Verify syntax is valid (no parse errors)")
    [void]$PlanContent.AppendLine("  - Verify tests pass (if applicable)")
    [void]$PlanContent.AppendLine("  - Verify integration works (if applicable)")
    [void]$PlanContent.AppendLine("")
    
    [void]$PlanContent.AppendLine("### Workflow")
    [void]$PlanContent.AppendLine("- **Pattern:** Builder → Validator → [Next Builder]")
    [void]$PlanContent.AppendLine("- **Rule:** No Builder proceeds without previous Validator passing")
    [void]$PlanContent.AppendLine("- **Escalation:** If validation fails 3 times, escalate to human")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("---")
    [void]$PlanContent.AppendLine("")
    
    # Phases
    $PhaseNumber = 1
    foreach ($Phase in $Phases) {
        [void]$PlanContent.AppendLine("## Phase ${PhaseNumber}: $($Phase.Name)")
        [void]$PlanContent.AppendLine("")
        
        $TaskNumber = 1
        foreach ($TaskPair in $Phase.Tasks) {
            $BuilderTask = $TaskPair.Builder
            $ValidatorTask = $TaskPair.Validator
            
            [void]$PlanContent.AppendLine("### Phase ${PhaseNumber}.${TaskNumber}")
            [void]$PlanContent.AppendLine("")
            
            if ($IncludeEstimates) {
                $Estimate = switch ($Phase.Name) {
                    "Setup & Foundation" { "30m" }
                    "Core Implementation" { "1-2h" }
                    "Integration & Testing" { "1h" }
                    "Documentation & Handover" { "30m" }
                    "Analysis & Planning" { "45m" }
                    "Refactoring Execution" { "1-2h" }
                    "Validation" { "30m" }
                    "Discovery & Analysis" { "1h" }
                    "Reporting" { "45m" }
                    default { "TBD" }
                }
                [void]$PlanContent.AppendLine("- [ ] **Builder** [$Estimate]: $BuilderTask")
                [void]$PlanContent.AppendLine("  - [ ] **Validator** [15m]: $ValidatorTask")
            }
            else {
                [void]$PlanContent.AppendLine("- [ ] **Builder**: $BuilderTask")
                [void]$PlanContent.AppendLine("  - [ ] **Validator**: $ValidatorTask")
            }
            [void]$PlanContent.AppendLine("")
            $TaskNumber++
        }
        
        [void]$PlanContent.AppendLine("---")
        [void]$PlanContent.AppendLine("")
        $PhaseNumber++
    }
    
    # Completion criteria
    [void]$PlanContent.AppendLine("## Completion Criteria")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("- [ ] All Builder tasks completed")
    [void]$PlanContent.AppendLine("- [ ] All Validator checks passed")
    [void]$PlanContent.AppendLine("- [ ] No critical issues remaining")
    [void]$PlanContent.AppendLine("- [ ] Documentation updated")
    [void]$PlanContent.AppendLine("- [ ] Handover notes created")
    [void]$PlanContent.AppendLine("")
    
    # Escalation triggers
    [void]$PlanContent.AppendLine("## Escalation Triggers")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("- Builder fails 3 consecutive attempts → Escalate to human")
    [void]$PlanContent.AppendLine("- Validator fails 3 consecutive attempts → Escalate to human")
    [void]$PlanContent.AppendLine("- Unclear requirements → Request clarification before proceeding")
    [void]$PlanContent.AppendLine("- Breaking changes detected → Pause and assess impact")
    [void]$PlanContent.AppendLine("")
    
    # Notes
    [void]$PlanContent.AppendLine("## Notes")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("- Use Australian English (en-AU) for all documentation")
    [void]$PlanContent.AppendLine("- Follow existing code patterns and conventions")
    [void]$PlanContent.AppendLine("- Ensure Australian compliance (DD/MM/YYYY dates, AUD currency)")
    [void]$PlanContent.AppendLine("- All code must pass hooks validation (security, quality, compliance)")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("---")
    [void]$PlanContent.AppendLine("")
    [void]$PlanContent.AppendLine("*Generated by plan_w_team v2.0.0*")
    [void]$PlanContent.AppendLine("*NodeJS-Starter-V1 Builder/Validator System*")

    # Write to file
    $OutputDirectory = Split-Path -Parent $OutputPath
    if (!(Test-Path $OutputDirectory)) {
        New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
        Write-Host "Created directory: $OutputDirectory" -ForegroundColor Green
    }
    
    $PlanContent.ToString() | Out-File -FilePath $OutputPath -Encoding UTF8
    
    # Output summary
    Write-Host "Plan generated successfully!" -ForegroundColor Green
    Write-Host "   Location: $OutputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Plan Summary:" -ForegroundColor Yellow
    
    $TotalTasks = 0
    foreach ($Phase in $Phases) {
        $TotalTasks += $Phase.Tasks.Count
    }
    
    Write-Host "   Phases: $($Phases.Count)" -ForegroundColor White
    Write-Host "   Task Pairs: $TotalTasks" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review the plan: code $OutputPath" -ForegroundColor Gray
    Write-Host "   2. Start with Phase 1, Task 1 (Builder)" -ForegroundColor Gray
    Write-Host "   3. Complete Validator before moving to next Builder" -ForegroundColor Gray
    Write-Host ""
    
    # Return plan info
    return @{
        TaskId = $TaskId
        OutputPath = $OutputPath
        Phases = $Phases.Count
        TotalTasks = $TotalTasks
        Timestamp = $Timestamp
    }
}

# Create alias
Set-Alias -Name pwt -Value plan_w_team

# Export
Export-ModuleMember -Function plan_w_team -Alias pwt
