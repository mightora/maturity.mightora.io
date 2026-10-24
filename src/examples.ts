import { template } from "./templates.ts";
import { clone, type Assessment, type Score } from "./model.ts";
import { snapshot } from "./engine.ts";

type Observation = [Score, number, string, string, string, string];
interface Scenario {
  name: string;
  title: string;
  organisation: string;
  scope: string;
  weighted: boolean;
  observations: Observation[];
}
export const SAMPLE_SCENARIOS: Record<string, Scenario> = {
  general: {
    name: "Organisation · growing service provider",
    title: "Organisational capability — growth readiness",
    organisation: "Fictional Northbridge Community Services",
    scope:
      "Three service teams expanding from one regional office to four. Priorities are continuity, accountable processes and consistent customer outcomes.",
    weighted: false,
    observations: [
      [
        3,
        4,
        "Strategy director",
        "September investment review linked 8 of 10 proposals to agreed service outcomes; benefits owners were absent on two.",
        "Require a benefits owner and outcome measure before investment approval.",
        "Unowned benefits could weaken investment decisions.",
      ],
      [
        2,
        3,
        "Governance manager",
        "Policy register contains 24 policies; nine have passed their review date and four have no named owner.",
        "Assign policy owners and complete the nine overdue reviews before opening the next office.",
        "Teams may apply obsolete operating guidance.",
      ],
      [
        3,
        4,
        "Risk manager",
        "Monthly risk reviews take place; three cross-team mitigations remained overdue in the September register.",
        "Escalate overdue mitigations and record acceptance decisions at the operations board.",
        "Cross-team risks may remain untreated.",
      ],
      [
        2,
        3,
        "People lead",
        "Skills profiles exist for 18 of 30 roles; managers maintain separate training spreadsheets.",
        "Complete the role skills matrix and fund the highest-priority development gaps.",
        "Expansion could outpace available skills.",
      ],
      [
        2,
        4,
        "Operations director",
        "Five of eight customer processes have documented owners; hand-offs between intake and fulfilment are disputed.",
        "Agree accountable owners and hand-off measures for all eight customer processes.",
        "Customers may be passed between teams without resolution.",
      ],
      [
        1,
        4,
        "Improvement lead",
        "Teams collect suggestions but the last six improvements have no recorded outcome measures.",
        "Pilot a monthly improvement board with one baseline and one outcome measure per experiment.",
        "Effort may be spent on changes that do not improve services.",
      ],
      [
        2,
        4,
        "Data steward",
        "Sample of 100 customer records found 17 missing contact preferences and 11 duplicate records.",
        "Introduce ownership, validation rules and monthly duplicate-resolution reviews.",
        "Poor contact data can cause avoidable service failures.",
      ],
      [
        2,
        4,
        "Service continuity lead",
        "A backup restore succeeded in August, but no complete office-loss exercise has been run.",
        "Exercise a complete office-loss scenario and agree recovery objectives with service owners.",
        "An office outage could stop essential customer services.",
      ],
      [
        3,
        4,
        "Performance analyst",
        "Monthly dashboards cover response times; customer satisfaction is reported inconsistently between offices.",
        "Agree common service measures and record decisions arising from the monthly review.",
        "Local reporting differences can hide deteriorating service.",
      ],
    ],
  },
  cloud: {
    name: "Cloud and Azure · landing-zone improvement",
    title: "Azure landing zone — operational readiness",
    organisation: "Fictional Harbour Retail Group",
    scope:
      "Twelve subscriptions supporting online retail and analytics. The exercise focuses on cost ownership, privileged access and tested recovery before peak trading.",
    weighted: true,
    observations: [
      [
        3,
        4,
        "Cloud platform lead",
        "All twelve subscriptions have billing owners; two inherited subscriptions remain outside the intended management-group structure.",
        "Move inherited subscriptions through the approved management-group onboarding process.",
        "Inherited workloads may miss intended governance controls.",
      ],
      [
        3,
        4,
        "Cloud governance lead",
        "Policy evaluation covers all subscriptions; seven exceptions have no expiry date.",
        "Assign exception owners and expiry dates, then review remediation at the platform board.",
        "Permanent exceptions can erode deployment standards.",
      ],
      [
        2,
        4,
        "FinOps analyst",
        "Thirty-one percent of September spend lacked a product tag; budget alerts have no agreed responder.",
        "Assign product cost owners, repair tagging and test the budget-alert response process.",
        "Unallocated spending could grow without accountable decisions.",
      ],
      [
        3,
        4,
        "Identity lead",
        "Privileged access is time limited for platform administrators; four emergency accounts have not been exercised this quarter.",
        "Exercise emergency access and record independent reviews of privileged assignments.",
        "Unverified emergency access could delay incident recovery.",
      ],
      [
        2,
        4,
        "Security engineer",
        "Six application registrations use client secrets; two credentials expire within sixty days.",
        "Replace eligible secrets with workload identities and assign rotation ownership for the remainder.",
        "Expired or exposed credentials can interrupt integrations.",
      ],
      [
        4,
        4,
        "Platform engineering lead",
        "The staging landing zone was rebuilt from reviewed source in September; drift checks run daily.",
        "Retain rebuild evidence and track drift findings to closure each month.",
        "Unreviewed exceptions could introduce configuration drift.",
      ],
      [
        3,
        4,
        "Site reliability lead",
        "Checkout service indicators are measured; three alerts have repeatedly fired without an actionable runbook.",
        "Tune noisy alerts and link every critical alert to an owned response runbook.",
        "Alert fatigue could delay response to trading incidents.",
      ],
      [
        1,
        4,
        "Business continuity lead",
        "Backups are scheduled, but the payment and fulfilment recovery sequence has never been exercised end to end.",
        "Run a cross-service restore exercise before peak trading and record achieved recovery times.",
        "Untested recovery dependencies could extend a trading outage.",
      ],
      [
        4,
        4,
        "Network lead",
        "Approved network diagrams and firewall change records cover all production subscriptions.",
        "Reconcile diagrams and firewall rules during the next quarterly boundary review.",
        "Documentation could diverge from deployed trust boundaries.",
      ],
    ],
  },
  devops: {
    name: "Software engineering · safer releases",
    title: "Engineering maturity — safer weekly releases",
    organisation: "Fictional Meridian Software",
    scope:
      "Four product squads delivering a customer portal. Build automation is established; recovery, incident learning and critical-journey testing lag behind.",
    weighted: true,
    observations: [
      [
        4,
        4,
        "Engineering manager",
        "Protected branches require two reviewers; a sample of twenty changes showed consistent review evidence.",
        "Keep the review standard and periodically sample emergency-change exceptions.",
        "Emergency bypasses could weaken peer review.",
      ],
      [
        2,
        4,
        "Quality engineering lead",
        "Unit tests run in every build, but account recovery and invoice export have no maintained end-to-end coverage.",
        "Automate the two critical journeys and make failures block release promotion.",
        "A successful build can still ship broken customer journeys.",
      ],
      [
        3,
        4,
        "Developer experience lead",
        "Dependency updates are raised weekly; three high-priority findings exceeded the agreed triage window.",
        "Assign triage cover and measure time to resolve supported dependency findings.",
        "Unresolved dependencies could increase security exposure.",
      ],
      [
        4,
        4,
        "Build engineer",
        "Every proposed change produces a versioned artefact and runs lint, type and unit checks.",
        "Measure flaky builds and preserve the required validation policy.",
        "Flaky checks could encourage unsafe workarounds.",
      ],
      [
        4,
        4,
        "Release lead",
        "The same signed artefact is promoted through test and production with recorded approvals.",
        "Keep artefact traceability and rehearse the emergency release path.",
        "Emergency processes may drift from normal release controls.",
      ],
      [
        2,
        4,
        "Site reliability lead",
        "Feature flags are used by one squad; the last rollback required forty minutes of manual database repair.",
        "Agree reversible rollout patterns and rehearse an application-and-data rollback.",
        "A failed release could require prolonged manual recovery.",
      ],
      [
        3,
        4,
        "Service owner",
        "All services have owners; two squads have not agreed measurable service objectives.",
        "Agree service objectives with product owners and use them in release decisions.",
        "Release pace may be prioritised over customer reliability.",
      ],
      [
        1,
        3,
        "Incident coordinator",
        "Five incident reviews were completed, but actions have no shared owner or completion register.",
        "Track incident actions to closure and review recurring causes at the monthly engineering forum.",
        "The same failure may recur without sustained corrective action.",
      ],
      [
        2,
        3,
        "Delivery manager",
        "Lead time is measured manually; squads use different definitions of a failed deployment.",
        "Agree common delivery measures and use trends to select one improvement experiment per quarter.",
        "Incomparable measures could drive misleading performance decisions.",
      ],
    ],
  },
  security: {
    name: "Cybersecurity · governance and recovery",
    title: "Security governance — evidence and recovery review",
    organisation: "Fictional Cedar Care Network",
    scope:
      "Six care sites and their central support services. This fictional exercise is a generic capability review, not a compliance audit or security certification.",
    weighted: true,
    observations: [
      [
        3,
        4,
        "Information risk owner",
        "The risk register has named owners; two accepted risks have no documented review date.",
        "Add review dates and evidence requirements to every risk acceptance.",
        "Risk acceptance can outlive the assumptions behind it.",
      ],
      [
        2,
        4,
        "Supplier assurance lead",
        "Eight of fourteen critical suppliers have current assurance records; access reviews are held separately.",
        "Review the six outstanding suppliers and link assurance to access decisions.",
        "Supplier access may remain active without current assurance.",
      ],
      [
        3,
        4,
        "People security lead",
        "Ninety-four percent completed role-based training; temporary staff reporting routes were inconsistent in interviews.",
        "Include temporary staff in induction and exercise the incident-reporting route.",
        "Staff may delay reporting suspicious activity.",
      ],
      [
        3,
        4,
        "Identity manager",
        "Leaver checks are sampled monthly; shared operational accounts remain in use at two sites.",
        "Replace shared accounts with attributable access and review emergency-access arrangements.",
        "Shared access can obscure accountability.",
      ],
      [
        2,
        4,
        "Data protection lead",
        "Retention rules exist for clinical records but three shared document libraries have no assigned classification owner.",
        "Assign information owners and apply reviewed classification and retention rules.",
        "Sensitive documents may be retained or shared inappropriately.",
      ],
      [
        1,
        3,
        "Security architect",
        "One recent system change has a threat review; four other designs have no recorded threat decisions.",
        "Pilot a proportionate threat-review checklist on all significant changes.",
        "Design weaknesses may be discovered only after release.",
      ],
      [
        null,
        4,
        "Detection lead",
        "Detection coverage has not yet been reviewed; absence of evidence is not recorded as a low maturity score.",
        "Complete a scoped detection assessment and validate priority scenarios before assigning a score.",
        "Unverified detection coverage creates an assurance gap.",
      ],
      [
        2,
        4,
        "Incident response lead",
        "The response plan is owned but the latest exercise excluded site managers and communications staff.",
        "Run a multi-site incident exercise including operational and communications decisions.",
        "Unclear coordination could delay containment and communication.",
      ],
      [
        2,
        4,
        "Continuity manager",
        "A file restore was demonstrated; recovery of the scheduling service and its integrations remains untested.",
        "Exercise the complete scheduling-service recovery and record achieved recovery objectives.",
        "Service dependencies could prevent timely restoration of care scheduling.",
      ],
    ],
  },
  architecture: {
    name: "Enterprise architecture · portfolio alignment",
    title: "Enterprise architecture — portfolio alignment",
    organisation: "Fictional Westhaven Transport",
    scope:
      "A transport operator consolidating three acquired businesses. Architecture work must connect capability needs, portfolio decisions and feasible transition steps.",
    weighted: false,
    observations: [
      [
        2,
        4,
        "Business architect",
        "Capability maps cover two acquired businesses; the third still uses a separate process taxonomy.",
        "Agree a common capability vocabulary and map the third business with its owners.",
        "Inconsistent capability definitions can duplicate investment.",
      ],
      [
        3,
        4,
        "Chief architect",
        "Quarterly architecture forums include operations; frontline accessibility concerns are not consistently recorded.",
        "Capture stakeholder concerns and trace their resolution in significant decisions.",
        "Important operational needs could be lost during consolidation.",
      ],
      [
        2,
        4,
        "Portfolio director",
        "Portfolio submissions list costs and delivery dates; only half identify the capabilities they improve.",
        "Require capability impacts and outcome owners in portfolio submissions.",
        "Projects may compete without a clear view of strategic benefit.",
      ],
      [
        3,
        4,
        "Architecture governance lead",
        "Reviews are proportionate to risk; four exceptions remain open beyond their original review date.",
        "Assign exception expiry dates and review the four overdue decisions.",
        "Temporary architecture exceptions can become permanent constraints.",
      ],
      [
        3,
        4,
        "Solution architecture lead",
        "Decision records are used by two programmes; rejected options are often omitted.",
        "Include alternatives, assumptions and consequences in the shared decision record.",
        "Teams may repeat decisions without understanding earlier trade-offs.",
      ],
      [
        2,
        3,
        "Platform architect",
        "Six integration patterns exist; adoption guidance and maintenance ownership are incomplete.",
        "Publish owned pattern guidance and validate it against two live delivery teams.",
        "Teams may apply patterns outside their intended context.",
      ],
      [
        2,
        4,
        "Architecture repository owner",
        "Application inventory is current for 70 percent of services; business ownership is missing on fourteen entries.",
        "Assign record owners and introduce a quarterly inventory reconciliation.",
        "Portfolio decisions may rely on incomplete dependency information.",
      ],
      [
        3,
        4,
        "Transformation lead",
        "Transition roadmaps identify sequencing but two shared dependencies have no funded delivery owner.",
        "Resolve dependency ownership and agree funded transition increments.",
        "Unowned dependencies could block multiple programmes.",
      ],
      [
        1,
        3,
        "Architecture practice lead",
        "The practice counts reviews completed but does not measure reduced duplication or delivery outcomes.",
        "Baseline one measurable outcome for each major architecture intervention.",
        "Activity counts could disguise limited organisational benefit.",
      ],
    ],
  },
};
export const SAMPLE_OPTIONS = [
  { key: "power", name: "Power Platform · governance and engineering" },
  ...Object.entries(SAMPLE_SCENARIOS).map(([key, s]) => ({
    key,
    name: s.name,
  })),
];
export function sampleAssessment(key: string): Assessment {
  if (key === "power") return template("power", true);
  const scenario = SAMPLE_SCENARIOS[key];
  if (!scenario) throw new Error("Unknown sample assessment.");
  const a = template(key);
  if (a.capabilities.length !== scenario.observations.length)
    throw new Error("Sample observations do not match the framework.");
  Object.assign(a, {
    title: scenario.title,
    organisation: scenario.organisation,
    description: `${scenario.scope} All organisations, observations and scores are fictional examples. Replace them with verified evidence before making decisions.`,
    date: "2026-10-20",
    reviewDate: "2027-01-20",
    owner: "Illustrative assessment working group",
    assessmentVersion: "1.0",
    weighted: scenario.weighted,
  });
  a.capabilities.forEach((c, index) => {
    const [current, target, owner, evidence, recommendations, risks] =
      scenario.observations[index];
    Object.assign(c, {
      current,
      target,
      owner,
      evidence: `Illustrative observation, September 2026: ${evidence}`,
      recommendations,
      risks,
      priority:
        current === null ||
        /recovery|resilience|identity|access|safety|supplier|data protection|automated testing/i.test(
          c.name,
        )
          ? "High"
          : typeof current === "number" && current >= target
            ? "Low"
            : "Medium",
      weight: /recovery|resilience|identity|access|safety/i.test(c.name)
        ? 3
        : 1,
      due: `2027-0${(index % 3) + 1}-20`,
      notes:
        "Fictional teaching example. Scores reflect only the stated scope; priorities are business decisions, not a ranking by gap size.",
    });
    c.criteria[0].met = typeof current === "number" && current >= 3;
    c.criteria[0].evidence = c.evidence;
    c.criteria[1].met = typeof current === "number" && current >= 4;
    c.criteria[1].evidence =
      current === null
        ? "Not yet reviewed."
        : c.criteria[1].met
          ? "Illustrative September sample showed consistent adoption across the stated scope."
          : "Consistent adoption has not yet been demonstrated across the full scope.";
  });
  const previous = clone(a);
  previous.capabilities.forEach((c, i) => {
    if (typeof c.current === "number")
      c.current = Math.max(1, c.current - (i % 2 === 0 ? 1 : 0));
  });
  previous.date = "2026-04-20";
  previous.description = `Fictional April baseline for ${scenario.organisation}. Historical observations are independent of the October review.`;
  previous.capabilities.forEach((c) => {
    c.evidence =
      "Illustrative April baseline workshop: adoption evidence was incomplete; see the October review for current observations.";
    c.criteria.forEach((criterion) => {
      criterion.met = false;
      criterion.evidence = "Not verified at the April baseline.";
    });
  });
  a.snapshots.push(snapshot(previous, "April baseline", previous.date));
  previous.date = "2026-07-20";
  previous.capabilities.forEach((c, i) => {
    if (typeof c.current === "number" && i % 4 === 0)
      c.current = Math.min(5, c.current + 1);
    c.evidence =
      "Illustrative July review: selected improvement actions completed; wider adoption remained under review.";
  });
  a.snapshots.push(snapshot(previous, "July review", previous.date));
  return a;
}
