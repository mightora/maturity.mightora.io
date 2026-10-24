import {
  blank,
  capability,
  clone,
  uid,
  type Assessment,
  type Priority,
  type Score,
} from "./model.ts";
import { snapshot } from "./engine.ts";

type Practice = [
  string,
  Score,
  number,
  string,
  string,
  string,
  string,
  Priority,
  number,
];
const domains: { name: string; owner: string; practices: Practice[] }[] = [
  {
    name: "Outcomes, priorities and governance",
    owner: "Programme sponsor",
    practices: [
      [
        "Outcome alignment and success measures",
        3,
        4,
        "All three workstreams have agreed objectives; two proposed features lack a measurable outcome or baseline.",
        "Link every funded increment to an outcome, baseline and accountable business owner.",
        "Teams could deliver scope without improving customer outcomes.",
        "Trace a representative increment from an agreed outcome through delivery to a measurable success criterion.",
        "High",
        3,
      ],
      [
        "Decision rights and escalation",
        2,
        4,
        "A weekly steering forum exists, but six cross-team decisions waited more than ten working days for an owner.",
        "Publish decision rights and escalation timeboxes, and review ageing decisions weekly.",
        "Slow decisions could block several teams despite available delivery capacity.",
        "Demonstrate named decision owners, delegated authority and a time-bound escalation route.",
        "High",
        3,
      ],
      [
        "Portfolio prioritisation and trade-offs",
        2,
        3,
        "Work is prioritised within teams, while sponsor requests regularly bypass the programme-level ranking.",
        "Use one visible prioritisation process and record the consequences of urgent requests.",
        "Unplanned work could displace more valuable commitments without an explicit decision.",
        "Inspect recent priority changes for value, capacity impact, decision ownership and communicated trade-offs.",
        "Medium",
        2,
      ],
    ],
  },
  {
    name: "Planning, forecasting and financial control",
    owner: "Programme delivery manager",
    practices: [
      [
        "Scope clarity and backlog readiness",
        3,
        4,
        "Near-term backlog items have acceptance criteria; two external dependencies are not represented in the plan.",
        "Include dependency acceptance criteria and keep the next delivery increment sufficiently understood.",
        "Apparently ready work could stall when an external dependency is discovered.",
        "Sample near-term work for clear outcomes, acceptance criteria, dependencies and an accountable owner.",
        "Medium",
        2,
      ],
      [
        "Evidence-based forecasting",
        2,
        4,
        "The delivery date is reported as a single commitment; recent throughput and uncertainty are not used in forecasts.",
        "Publish forecast ranges, assumptions and confidence using observed delivery performance.",
        "Stakeholders may treat an uncertain date as a reliable commitment.",
        "Compare successive forecasts with actual outcomes and retain the assumptions behind changes.",
        "High",
        3,
      ],
      [
        "Budget, supplier and commercial control",
        3,
        4,
        "Monthly spend is reconciled; one supplier change request lacks an agreed impact on forecast cost and outcomes.",
        "Review supplier changes against scope, acceptance, cost-to-complete and expected value before approval.",
        "Commercial changes could increase costs without a corresponding delivery benefit.",
        "Trace approved changes to contractual acceptance, financial authority and updated cost-to-complete forecasts.",
        "Medium",
        2,
      ],
    ],
  },
  {
    name: "People, flow and dependencies",
    owner: "Delivery practice lead",
    practices: [
      [
        "Capacity, skills and sustainable pace",
        2,
        4,
        "Two specialists are assigned across all three workstreams; overtime has risen for three consecutive reporting periods.",
        "Replan to realistic capacity, agree specialist allocation and address sustained overload.",
        "Overcommitment could increase mistakes, delays and staff turnover.",
        "Show a capacity plan that considers skills, competing commitments, leave and sustainable working patterns.",
        "High",
        3,
      ],
      [
        "Flow and work-in-progress control",
        2,
        3,
        "Teams start new work while blocked items age; no shared work-in-progress limit is used.",
        "Set practical work-in-progress policies and review blocked-item age before starting more work.",
        "High levels of unfinished work could lengthen lead time and hide bottlenecks.",
        "Review work-item age, blockers and throughput, and demonstrate decisions that improve flow.",
        "Medium",
        2,
      ],
      [
        "Cross-team and supplier dependencies",
        1,
        4,
        "Dependency dates are held in separate plans; a supplier hand-off has no agreed acceptance owner.",
        "Create an owned dependency register with acceptance conditions and review the critical hand-offs weekly.",
        "An unmanaged hand-off could delay the whole programme.",
        "Trace critical dependencies to named provider and recipient owners, acceptance conditions and contingency decisions.",
        "High",
        3,
      ],
    ],
  },
  {
    name: "Quality, risk and release assurance",
    owner: "Delivery assurance lead",
    practices: [
      [
        "Quality ownership and acceptance",
        3,
        4,
        "Acceptance criteria are used by all teams; accessibility and operational acceptance evidence varies between workstreams.",
        "Agree proportionate quality and acceptance criteria, including nonfunctional and operational needs.",
        "A feature could be accepted despite failing important user or service requirements.",
        "Inspect evidence that business, technical and operational acceptance criteria are satisfied before acceptance.",
        "High",
        3,
      ],
      [
        "Risk, assumptions and issue management",
        3,
        4,
        "The risk register is reviewed fortnightly; four high-impact assumptions have no validation date.",
        "Assign owners and validation dates to critical assumptions and review treatment effectiveness.",
        "Unvalidated assumptions could invalidate the plan late in delivery.",
        "Trace significant risks, issues and assumptions to owners, treatment decisions and timely follow-up.",
        "High",
        3,
      ],
      [
        "Release readiness and contingency",
        2,
        4,
        "Release meetings occur, but the last readiness review omitted a business rollback decision and customer communication rehearsal.",
        "Use evidence-based readiness criteria and rehearse contingency decisions with business and service owners.",
        "A release could disrupt operations without a workable fallback.",
        "Demonstrate go/no-go authority, readiness evidence, contingency arrangements and recovery decision points.",
        "High",
        3,
      ],
    ],
  },
  {
    name: "Stakeholders, communication and business change",
    owner: "Business change lead",
    practices: [
      [
        "Stakeholder participation and feedback",
        3,
        4,
        "Frontline representatives attend demonstrations; feedback from one smaller service location is missing.",
        "Include underrepresented users and track feedback through prioritisation and acceptance decisions.",
        "Delivery could meet the needs of the loudest stakeholder group while excluding others.",
        "Show representative stakeholder participation and trace material feedback to a decision or delivered change.",
        "Medium",
        2,
      ],
      [
        "Delivery transparency and reporting",
        1,
        4,
        "Status reports are manually assembled and show activity completed; uncertainty, blockers and decisions needed are absent.",
        "Publish a concise evidence-led view of outcomes, forecasts, risks and decisions needed.",
        "Optimistic activity reporting could delay corrective action.",
        "Reconcile reported status with delivery evidence and make uncertainty, blockers and required decisions visible.",
        "Medium",
        1,
      ],
      [
        "Adoption and business readiness",
        2,
        4,
        "Training is scheduled, but three affected teams have no agreed process owner or adoption measure.",
        "Agree process ownership, training, support and adoption measures before each business rollout.",
        "A delivered capability may not be adopted or sustained in everyday work.",
        "Demonstrate readiness across people, processes and support, then review adoption after rollout.",
        "High",
        3,
      ],
    ],
  },
  {
    name: "Benefits, service transition and learning",
    owner: "Business service owner",
    practices: [
      [
        "Benefits ownership and measurement",
        null,
        4,
        "Benefits were described in the business case, but baselines and measurement ownership have not yet been assessed.",
        "Validate benefit baselines, appoint benefit owners and agree when and how outcomes will be measured.",
        "Investment benefits could be claimed without evidence of real improvement.",
        "Trace each material benefit to an owner, baseline, measurement approach and planned review date.",
        "High",
        3,
      ],
      [
        "Service handover and support ownership",
        2,
        4,
        "Support teams receive release notes, but monitoring, knowledge transfer and ownership acceptance are not consistently recorded.",
        "Agree and evidence service acceptance, support ownership, knowledge transfer and early-life support.",
        "Operational teams could inherit a service they cannot support confidently.",
        "Inspect handover acceptance for ownership, support procedures, knowledge, monitoring and early-life arrangements.",
        "High",
        3,
      ],
      [
        "Retrospectives and improvement follow-through",
        2,
        3,
        "Retrospectives occur monthly; seven improvement actions have no owner or completion review.",
        "Limit improvement actions to a manageable set with owners and review whether completed changes improve delivery.",
        "Recurring delivery problems may persist despite regular retrospectives.",
        "Trace a completed improvement from an observed problem through action to a reviewed outcome.",
        "Medium",
        2,
      ],
    ],
  },
];
export function deliveryMaturitySample(): Assessment {
  const a = blank();
  Object.assign(a, {
    title: "Delivery maturity — predictable outcomes and sustainable delivery",
    organisation: "Fictional Brookfield Services",
    description:
      "Fictional customer-operations transformation across three workstreams, two suppliers and four business teams. Covers end-to-end delivery rather than only software engineering. Suitable for adapting to iterative, phased or hybrid delivery. All observations and scores are fictional teaching data, not a certified framework or an assessment of a real organisation. Benefits measurement is deliberately unassessed until evidence is gathered.",
    framework:
      "Mightora delivery capability example · generic five-level maturity model",
    date: "2026-10-24",
    reviewDate: "2027-01-24",
    owner: "Programme delivery and assurance working group",
    assessmentVersion: "1.0",
    weighted: true,
  });
  const guidance = [
    "Delivery depends on individual effort and reactive responses; decisions and outcomes are difficult to trace.",
    "Some delivery practices repeat, but ownership, adoption or evidence remains inconsistent across workstreams.",
    "Agreed delivery practices, responsibilities and acceptance criteria are established across the assessed scope.",
    "Delivery outcomes, flow, forecasts and risks are measured and used in regular governance and improvement decisions.",
    "Teams continuously test and improve delivery practices using outcome evidence, feedback and sustained learning.",
  ];
  a.levels.forEach((level, i) => {
    level.guidance = guidance[i];
    level.evidence =
      "Use dated plans, decision records, observed delivery outcomes and representative stakeholder feedback; document exceptions and scope.";
  });
  for (const domain of domains) {
    const d = {
      id: uid(),
      name: domain.name,
      description: `Delivery assessment of ${domain.name.toLowerCase()}.`,
      groups: [{ id: uid(), name: "Delivery practice and evidence" }],
    };
    a.domains.push(d);
    for (const [
      name,
      current,
      target,
      observation,
      action,
      risk,
      criterion,
      priority,
      weight,
    ] of domain.practices) {
      const c = capability(d.id, d.groups[0].id);
      Object.assign(c, {
        name,
        description: criterion,
        current,
        target,
        owner: domain.owner,
        priority,
        weight,
        evidence: `Fictional October 2026 delivery review: ${observation}`,
        recommendations: action,
        risks: risk,
        due: priority === "High" ? "2026-12-18" : "2027-01-22",
        notes:
          "Illustrative scenario. Weights reflect the importance of practices to this programme, not delivery certainty. Business priority is independent of the numeric gap: reporting has a larger gap than release readiness but a lower priority. Missing scores are excluded from averages. Replace all observations with verified local evidence.",
        criteria: [
          {
            id: uid(),
            text: criterion,
            met: typeof current === "number" && current >= 3,
            evidence: `Illustrative review evidence: ${observation}`,
          },
          {
            id: uid(),
            text: "Confirm consistent use across all three workstreams, with dated evidence and owned exceptions.",
            met: false,
            evidence:
              current === null
                ? "Not assessed: baseline evidence is outstanding."
                : "The fictional review found incomplete evidence of consistent use; follow-up is required.",
          },
        ],
      });
      a.capabilities.push(c);
    }
  }
  for (const [date, label, decrement] of [
    ["2026-04-24", "April delivery baseline", 1],
    ["2026-07-24", "July delivery review", 0],
  ] as const) {
    const past = clone(a);
    past.date = date;
    past.description = `Fictional ${label.toLowerCase()} for Brookfield Services. Historical evidence is independent of the October assessment.`;
    past.capabilities.forEach((c, i) => {
      if (typeof c.current === "number")
        c.current = Math.max(
          1,
          c.current - (decrement || (i % 3 === 0 ? 1 : 0)),
        );
      c.evidence = `Fictional ${label.toLowerCase()}: delivery practices were under review; October observations must not be used as evidence for this earlier date.`;
      c.criteria.forEach((criterion) => {
        criterion.met = false;
        criterion.evidence =
          "Historical teaching example; consistent practice was not verified at this review.";
      });
    });
    a.snapshots.push(snapshot(past, label, date));
  }
  return a;
}
