import { blank, capability, clone, uid, type Assessment } from "./model.ts";
import { snapshot } from "./engine.ts";
export const TEMPLATE_DEFINITIONS: Record<
  string,
  { name: string; domains: Record<string, [string, string, string][]> }
> = {
  general: {
    name: "General organisational capability",
    domains: {
      "Strategy and governance": [
        [
          "Strategic alignment",
          "Link investment decisions to measurable organisational outcomes.",
          "Trace investment decisions to agreed outcomes.",
        ],
        [
          "Policy management",
          "Maintain owned policies with review dates and exception routes.",
          "Inspect policy ownership, review dates and exceptions.",
        ],
        [
          "Risk management",
          "Identify, assign and review operational and strategic risks.",
          "Review the risk register and evidence of mitigation.",
        ],
      ],
      "People and delivery": [
        [
          "Skills and development",
          "Plan capability development against current delivery needs.",
          "Compare the skills matrix with development plans.",
        ],
        [
          "Process ownership",
          "Give key business processes accountable owners and measures.",
          "Trace process decisions to accountable owners.",
        ],
        [
          "Continuous improvement",
          "Use customer feedback and operational data to prioritise improvements.",
          "Review completed improvements and outcome measures.",
        ],
      ],
      "Information and operations": [
        [
          "Data quality",
          "Own critical data and measure its completeness and accuracy.",
          "Inspect quality measures and corrective actions.",
        ],
        [
          "Service resilience",
          "Test service recovery against documented business requirements.",
          "Review recovery objectives and exercise results.",
        ],
        [
          "Performance management",
          "Use agreed service measures in regular operational reviews.",
          "Inspect measures, trends and resulting decisions.",
        ],
      ],
    },
  },
  power: {
    name: "Power Platform maturity",
    domains: {
      "Governance and enablement": [
        [
          "Governance and environment strategy",
          "Separate workloads by purpose, sensitivity and lifecycle with clear ownership.",
          "Review environment inventory, provisioning rules and exception decisions.",
        ],
        [
          "Citizen developer enablement",
          "Support makers through training, reusable guidance and a proportionate review process.",
          "Inspect training records, support channels and escalation routes.",
        ],
        [
          "Data governance",
          "Classify business data and apply connector policies with reviewed exceptions.",
          "Inspect DLP policy scope, data owners and exception reviews.",
        ],
      ],
      "Architecture and security": [
        [
          "Dataverse architecture",
          "Apply deliberate table design, ownership, relationships and capacity planning.",
          "Review data models, table ownership and capacity forecasts.",
        ],
        [
          "Security and identity",
          "Apply least privilege, managed identities where supported and regular access reviews.",
          "Inspect role design, access review decisions and service account ownership.",
        ],
        [
          "Integration architecture",
          "Design integration contracts, error handling and recovery across platform boundaries.",
          "Trace a failed integration through monitoring and recovery.",
        ],
      ],
      "Engineering and delivery": [
        [
          "Application lifecycle management",
          "Keep solution changes in source control and promote managed artefacts consistently.",
          "Trace a production solution to source history and deployment evidence.",
        ],
        [
          "Deployment automation",
          "Use repeatable pipelines with approvals, validation and rollback arrangements.",
          "Observe a deployment and a documented recovery exercise.",
        ],
        [
          "Automated testing",
          "Cover important journeys and custom code with maintained automated checks.",
          "Review test results, failure handling and coverage of key journeys.",
        ],
      ],
      "Operations and resilience": [
        [
          "Monitoring and observability",
          "Measure service health, failures and business impact with named responders.",
          "Inspect actionable alerts, dashboards and incident records.",
        ],
        [
          "Recovery and continuity",
          "Demonstrate recovery of platform data and critical apps against agreed objectives.",
          "Review a restore exercise against RTO and RPO.",
        ],
        [
          "Capacity and licensing",
          "Forecast capacity and licence needs with evidence of regular review.",
          "Compare usage trends, licence allocations and forecasts.",
        ],
      ],
    },
  },
  cloud: {
    name: "Cloud and Azure maturity",
    domains: {
      "Landing zone and governance": [
        [
          "Subscription organisation",
          "Separate Azure workloads with clear billing and policy ownership.",
          "Review management groups, subscriptions and ownership.",
        ],
        [
          "Policy and resource consistency",
          "Enforce resource standards with reviewed exceptions.",
          "Inspect policy compliance and exception handling.",
        ],
        [
          "Cost management",
          "Measure unit costs and act on spend trends.",
          "Review tagged spend, budgets and optimisation decisions.",
        ],
      ],
      "Security and identity": [
        [
          "Privileged access",
          "Use time-limited privileged access and reviewed roles.",
          "Review privileged access activation and access reviews.",
        ],
        [
          "Workload identity",
          "Use workload identities and governed secrets.",
          "Inspect identity permissions and secret rotation evidence.",
        ],
      ],
      "Engineering and operations": [
        [
          "Infrastructure as code",
          "Deploy repeatable environments from reviewed source.",
          "Rebuild an environment from source-controlled definitions.",
        ],
        [
          "Observability",
          "Use service measures and actionable alerts.",
          "Inspect service indicators and incident outcomes.",
        ],
        [
          "Disaster recovery",
          "Exercise recovery against business objectives.",
          "Review recovery exercise results and remediation.",
        ],
        [
          "Network architecture",
          "Use documented trust boundaries and controlled connectivity.",
          "Trace a workload connection against network policy.",
        ],
      ],
    },
  },
  devops: {
    name: "Software engineering and DevOps maturity",
    domains: {
      "Engineering practice": [
        [
          "Code review",
          "Review changes against shared engineering standards.",
          "Inspect representative reviews and exception decisions.",
        ],
        [
          "Automated testing",
          "Maintain tests that protect critical behavior.",
          "Inspect failure detection and maintenance of tests.",
        ],
        [
          "Dependency management",
          "Maintain a supported inventory and address vulnerable dependencies.",
          "Review update cadence and vulnerability triage.",
        ],
      ],
      "Delivery automation": [
        [
          "Continuous integration",
          "Build and validate every proposed change.",
          "Trace a change through required validation.",
        ],
        [
          "Release automation",
          "Promote versioned artefacts with recovery plans.",
          "Trace an artefact from source to production.",
        ],
        [
          "Deployment safety",
          "Control rollout and evaluate release health.",
          "Inspect rollback exercises and release health decisions.",
        ],
      ],
      "Reliability and learning": [
        [
          "Service ownership",
          "Assign accountable ownership of service health.",
          "Review on-call ownership and service objectives.",
        ],
        [
          "Incident learning",
          "Use incident findings to drive measurable improvement.",
          "Trace incident actions through completion.",
        ],
        [
          "Delivery measures",
          "Use delivery measures to improve flow.",
          "Review trends and the decisions they informed.",
        ],
      ],
    },
  },
  security: {
    name: "Cybersecurity and governance maturity",
    domains: {
      "Governance and assurance": [
        [
          "Risk ownership",
          "Assign owners and treatment decisions for security risks.",
          "Review risk decisions and evidence of treatment.",
        ],
        [
          "Supplier assurance",
          "Assess supplier access and security obligations.",
          "Review supplier risk records and access decisions.",
        ],
        [
          "Security awareness",
          "Teach staff role-appropriate security practices.",
          "Review training outcomes and reporting routes.",
        ],
      ],
      "Protection and detection": [
        [
          "Identity and access",
          "Apply least privilege and review access regularly.",
          "Inspect joiner, mover, leaver and privilege reviews.",
        ],
        [
          "Data protection",
          "Classify information and apply appropriate protection.",
          "Inspect classification, retention and access evidence.",
        ],
        [
          "Threat modelling",
          "Review realistic threats during design changes.",
          "Trace threat findings to implemented controls.",
        ],
        [
          "Detection engineering",
          "Validate detection coverage with realistic exercises.",
          "Review detection tests and response outcomes.",
        ],
      ],
      "Response and recovery": [
        [
          "Incident response",
          "Exercise documented incident response arrangements.",
          "Review exercise evidence and corrective actions.",
        ],
        [
          "Recovery assurance",
          "Test recovery of critical information and services.",
          "Compare recovery outcomes with business objectives.",
        ],
      ],
    },
  },
  architecture: {
    name: "Enterprise architecture maturity",
    domains: {
      "Strategy and capability": [
        [
          "Business capability mapping",
          "Maintain an owned model of organisational capabilities.",
          "Trace a strategic objective to capability investment.",
        ],
        [
          "Stakeholder engagement",
          "Use stakeholder needs in architecture decisions.",
          "Review decisions alongside recorded stakeholder concerns.",
        ],
        [
          "Portfolio alignment",
          "Prioritise change against strategic capability needs.",
          "Inspect portfolio trade-offs and resulting priorities.",
        ],
      ],
      "Architecture practice": [
        [
          "Architecture governance",
          "Apply proportionate reviews and record exceptions.",
          "Inspect review outcomes and exception follow-up.",
        ],
        [
          "Architecture decisions",
          "Record decision context, options and consequences.",
          "Review decisions for traceability and currency.",
        ],
        [
          "Reference architectures",
          "Maintain reusable patterns with adoption guidance.",
          "Review pattern adoption and exception evidence.",
        ],
      ],
      "Information and transition": [
        [
          "Architecture repository",
          "Maintain discoverable and current architecture information.",
          "Inspect ownership and review dates for core models.",
        ],
        [
          "Transition roadmaps",
          "Define feasible migration increments with owners.",
          "Trace roadmap increments to delivered outcomes.",
        ],
        [
          "Architecture measures",
          "Measure whether architecture decisions improve outcomes.",
          "Review outcome measures and feedback into practice.",
        ],
      ],
    },
  },
};
export function template(key: string, example = false): Assessment {
  const definition = TEMPLATE_DEFINITIONS[key];
  if (!definition) throw new Error("Unknown template.");
  const a = blank();
  a.title = example
    ? "Power Platform governance and engineering example"
    : definition.name;
  a.framework = `${definition.name} · illustrative example framework`;
  a.description =
    "An editable example framework. This is not a certified assessment or a reproduction of a proprietary maturity model.";
  a.organisation = example ? "Example Council digital services" : "";
  a.owner = example ? "Platform architecture team" : "";
  a.date = example ? "2026-10-20" : a.date;
  a.reviewDate = example ? "2027-01-20" : "";
  Object.entries(definition.domains).forEach(([name, items], di) => {
    const d = {
      id: uid(),
      name,
      description: `Assessment of ${name.toLowerCase()} practices.`,
      groups: [{ id: uid(), name: "Core practices" }],
    };
    a.domains.push(d);
    items.forEach(([name, description, criterion], ci) => {
      const c = capability(d.id, d.groups[0].id);
      Object.assign(c, {
        name,
        description,
        criteria: [
          { id: uid(), text: criterion, met: false, evidence: "" },
          {
            id: uid(),
            text: "Confirm consistent adoption across the agreed assessment scope, supported by dated evidence.",
            met: false,
            evidence: "",
          },
        ],
      });
      if (example) {
        c.current =
          [2, 3, 2, 3, 4, 2, 3, 2, 2, 3, 2, 3][a.capabilities.length] ?? 2;
        c.target = ci === 1 ? 4 : 5;
        c.priority = ci === 0 ? "High" : ci === 1 ? "Medium" : "High";
        c.owner = [
          "Platform lead",
          "Solution architect",
          "Engineering lead",
          "Service owner",
        ][di];
        c.weight = ci === 0 ? 2 : 1;
        c.evidence = `Illustrative evidence: ${criterion} A sample review in September found the practice in two of four teams, with inconsistent follow-up.`;
        c.recommendations = `Agree a consistent approach for ${name.toLowerCase()}, assign ownership, and review adoption at the next quarterly assessment.`;
        c.risks =
          ci === 0
            ? "Inconsistent adoption could leave critical services without a clear accountable owner."
            : "";
        c.due = `2027-0${di + 1}-20`;
        c.notes =
          "Fictional data supplied to demonstrate the tool. Replace with your own assessment.";
        c.criteria[0].met = true;
        c.criteria[0].evidence = "Illustrative review notes, September 2026.";
      }
      a.capabilities.push(c);
    });
  });
  if (example) {
    const previous = clone(a);
    previous.capabilities.forEach((c) => {
      if (typeof c.current === "number") c.current = Math.max(1, c.current - 1);
    });
    previous.date = "2026-04-20";
    a.snapshots.push(snapshot(previous, "April baseline", "2026-04-20"));
    previous.capabilities.forEach((c) => {
      if (typeof c.current === "number") c.current = Math.min(5, c.current + 1);
    });
    previous.date = "2026-07-20";
    a.snapshots.push(snapshot(previous, "July review", "2026-07-20"));
  }
  return a;
}
