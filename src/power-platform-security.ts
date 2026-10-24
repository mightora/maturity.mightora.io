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

type Control = [
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
const domains: { name: string; owner: string; controls: Control[] }[] = [
  {
    name: "Identity and privileged administration",
    owner: "Platform identity lead",
    controls: [
      [
        "User sign-in and Conditional Access",
        3,
        4,
        "October test accounts required MFA; two legacy access exceptions have no expiry date.",
        "Review supported sign-in controls, close or time-limit exceptions and retain test evidence.",
        "Unreviewed exceptions may permit weaker authentication.",
        "Test representative user sign-ins, exception expiry and emergency-access arrangements against the agreed identity policy.",
        "High",
        3,
      ],
      [
        "Privileged administrator access",
        2,
        4,
        "Four administrators retain standing privileged roles; quarterly access review evidence is incomplete.",
        "Review administrator assignments and use approved time-limited elevation where available; exercise emergency access.",
        "Excessive standing privilege increases the impact of account compromise.",
        "Trace administrator assignments to an owner, approval, least-privilege rationale and periodic review.",
        "High",
        3,
      ],
      [
        "Application users and service identities",
        2,
        4,
        "Seven Dataverse application users exist; two hold broader roles than their documented integration requires.",
        "Map each application user to its workload and replace broad roles with tested minimum privileges.",
        "An integration identity could access unrelated business records.",
        "Use positive and negative API tests to prove the permissions of every in-scope application user.",
        "High",
        3,
      ],
    ],
  },
  {
    name: "Dataverse authorisation and sensitive data",
    owner: "Dataverse security architect",
    controls: [
      [
        "Business units, teams and security roles",
        3,
        4,
        "Role matrices cover three business units; cross-unit access has not been retested since a team restructure.",
        "Test effective privileges for representative users, teams and business-unit boundaries after the restructure.",
        "Role combinations could expose records across intended organisational boundaries.",
        "Validate effective table privileges and record access, including cumulative roles and team membership.",
        "High",
        3,
      ],
      [
        "Column security and sensitive information",
        2,
        4,
        "Sensitive-column classification exists, but two protected columns lack negative access-test evidence.",
        "Review supported column-security settings and test unauthorised read and update attempts through the app and API.",
        "Sensitive field values may be exposed despite restricted forms.",
        "Prove sensitive-column access with authorised and unauthorised identities; document feature limitations.",
        "High",
        3,
      ],
      [
        "Record sharing and access reviews",
        2,
        3,
        "A sample found twelve direct shares without recorded business owners or review dates.",
        "Assign sharing owners, remove obsolete grants and review direct sharing alongside team-based access.",
        "One-off sharing may outlive the original business requirement.",
        "Trace sampled record shares to a justified recipient, owner and review decision.",
        "Medium",
        2,
      ],
    ],
  },
  {
    name: "Environments and connector governance",
    owner: "Power Platform governance lead",
    controls: [
      [
        "Environment separation and membership",
        3,
        4,
        "Development and production are separated; production membership has not been reconciled with the support roster.",
        "Reconcile environment membership and platform roles, and review who may create or administer environments.",
        "Unnecessary environment access may weaken production governance.",
        "Verify environment purpose, membership restrictions and Dataverse roles independently; membership alone does not grant the intended data privileges.",
        "High",
        2,
      ],
      [
        "Data policies and connector classification",
        3,
        4,
        "Tenant data policies are documented; one recently introduced connector has not been classified explicitly.",
        "Review connector groups, default classification and environment coverage; test representative prohibited combinations.",
        "A new connector may create an unreviewed data movement route.",
        "Demonstrate applicable tenant and environment policy enforcement; do not treat data policies as record-level authorisation.",
        "High",
        3,
      ],
      [
        "Custom connectors and endpoint review",
        2,
        4,
        "Four custom connectors exist; two have no documented endpoint or authentication review.",
        "Review endpoints, authentication, supported policy controls and connector ownership before approving use.",
        "An unreviewed endpoint could receive sensitive information.",
        "Review custom connector contracts, destination ownership, authentication and applicable endpoint restrictions.",
        "High",
        2,
      ],
    ],
  },
  {
    name: "Power Apps, flows and secure delivery",
    owner: "Platform engineering lead",
    controls: [
      [
        "App sharing and underlying data access",
        3,
        4,
        "App sharing is reviewed monthly; data-source permissions are reviewed separately without a joined record.",
        "Review app audience and underlying data access together, then test denied access directly at the data source.",
        "App sharing controls may create a false impression of data protection.",
        "Test app sharing separately from Dataverse and other data-source authorisation; hidden controls are not a security boundary.",
        "High",
        3,
      ],
      [
        "Flow connections and execution context",
        2,
        4,
        "Three support flows use a broadly privileged owner connection; run-only access has no recorded security test.",
        "Review trigger access, run-only settings and the permissions of each connection used by the flow.",
        "A permitted caller may trigger actions with greater privileges than intended.",
        "Trace representative flow triggers through their configured connection identities and test unauthorised callers.",
        "High",
        3,
      ],
      [
        "Secure ALM and change approval",
        3,
        4,
        "Managed releases use pipelines; emergency changes have no consistent role-diff or secret-scan record.",
        "Include security-role changes, connector changes and secret checks in release and emergency-change review.",
        "A release could introduce excessive privileges or exposed credentials.",
        "Trace a production release to reviewed source, approvals, security checks and a recovery plan.",
        "Medium",
        2,
      ],
    ],
  },
  {
    name: "Power Pages and integration boundaries",
    owner: "External services security lead",
    controls: [
      [
        "Power Pages web roles and table permissions",
        2,
        4,
        "The customer portal uses contact-scoped permissions; direct Web API and file download isolation tests are missing.",
        "Test anonymous, customer A and customer B against forms, lists, Web API and direct file URLs; review effective web roles and table permissions.",
        "A permission error could expose another customer’s records or files.",
        "Prove server-side record isolation and intended anonymous access; page navigation and JavaScript filters do not authorise data access.",
        "High",
        3,
      ],
      [
        "Integration API authentication and scope",
        3,
        4,
        "Two integration APIs validate tokens; one client still requests a broader resource scope than documented.",
        "Review client permissions and authorisation at each API boundary, including denied-operation tests.",
        "An authenticated integration may still perform unauthorised operations.",
        "Test authentication, operation-level authorisation and input validation for each integration boundary.",
        "High",
        3,
      ],
      [
        "Secrets and connection lifecycle",
        2,
        4,
        "Credential owners are recorded; one connector credential has no tested rotation or revocation procedure.",
        "Use supported protected secret storage and rehearse credential rotation, revocation and connection recovery.",
        "A leaked or expired credential could expose data or interrupt a critical flow.",
        "Verify that credentials are absent from code and exports, and that rotation and revocation are demonstrated.",
        "High",
        3,
      ],
    ],
  },
  {
    name: "Copilot Studio and custom extensions",
    owner: "AI and application security lead",
    controls: [
      [
        "Agent authentication and publication",
        2,
        4,
        "Two pilot agents are inventoried; channel publication and authentication changes lack a formal review.",
        "Review intended audience, authentication, channel exposure and applicable agent data policies before publication.",
        "An agent could be published to an unintended audience.",
        "Test agent authentication and allowed channels with permitted and denied users; confirm policy coverage.",
        "High",
        2,
      ],
      [
        "Agent knowledge and tool permissions",
        null,
        4,
        "Pilot agent knowledge and tool access have not completed assessment; no numeric score has been assigned.",
        "Assess knowledge-source access, tool execution identities and sensitive output with representative user personas before production approval.",
        "An unreviewed tool or knowledge source could disclose information or perform unintended actions.",
        "Test knowledge retrieval and tool actions using users with different rights; record execution identity and authorisation decisions.",
        "High",
        3,
      ],
      [
        "Custom code and dependency assurance",
        2,
        3,
        "PCF controls, plug-ins and web resources are reviewed for functionality; security findings have no shared triage register.",
        "Review inputs, output encoding, privileged server operations and dependencies, and track findings to closure.",
        "Custom extensions may introduce weaknesses outside low-code configuration checks.",
        "Inspect representative PCF, plug-in and JavaScript changes for input validation, appropriate server-side authorisation and supported dependencies.",
        "Medium",
        2,
      ],
    ],
  },
  {
    name: "Audit, response and recovery",
    owner: "Platform service security owner",
    controls: [
      [
        "Audit coverage, retention and monitoring",
        2,
        4,
        "Dataverse auditing is enabled on selected tables; monitoring and retention have not been checked against agreed investigation needs.",
        "Map required audit events, supported log sources, retention and response ownership; exercise a suspicious-access investigation.",
        "An incident may not leave enough accessible evidence for investigation.",
        "Demonstrate the availability of agreed audit events and retention using supported, licensed platform capabilities.",
        "High",
        3,
      ],
      [
        "Security incident response",
        2,
        4,
        "The response plan names a platform owner but has not exercised compromised connections or excessive portal permissions.",
        "Run a tabletop covering identity containment, connection revocation, portal exposure and communication decisions.",
        "Delayed containment could extend data exposure.",
        "Exercise a platform-specific incident and record decision owners, containment actions and follow-up work.",
        "High",
        3,
      ],
      [
        "Backup, restore and security revalidation",
        3,
        4,
        "A sandbox restore was demonstrated; post-restore roles, flows and external connections were not included in the acceptance checklist.",
        "Exercise supported restore procedures and validate access, connections and critical journeys before returning service.",
        "Restoration could reintroduce obsolete access or unsafe integrations.",
        "Prove recovery against agreed objectives and independently revalidate authorisation and integration configuration afterwards.",
        "High",
        3,
      ],
    ],
  },
];
const references = [
  "https://learn.microsoft.com/en-us/power-platform/admin/database-security",
  "https://learn.microsoft.com/en-us/power-platform/admin/wp-data-loss-prevention",
  "https://learn.microsoft.com/en-us/power-pages/security/security-best-practices",
  "https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-data-loss-prevention",
];
export function powerPlatformSecuritySample(): Assessment {
  const a = blank();
  Object.assign(a, {
    title: "Power Platform security — access, data and operational assurance",
    organisation: "Fictional Alderbridge Services",
    description:
      "Fictional review of four production environments, two development/test environments, six Power Apps, twelve cloud flows, a customer-facing Power Pages site and two pilot Copilot Studio agents. All scores and observations are illustrative, not a security audit, certification or Microsoft-endorsed framework. Verify applicability, licensing and evidence in your own tenant. An unassessed agent capability is deliberately excluded from the current maturity average.",
    framework:
      "Mightora Power Platform security capability example · generic five-level maturity model",
    date: "2026-10-24",
    reviewDate: "2027-01-24",
    owner: "Platform security working group",
    assessmentVersion: "1.0",
    weighted: true,
  });
  for (const [di, domain] of domains.entries()) {
    const d = {
      id: uid(),
      name: domain.name,
      description: `Security capability review for ${domain.name.toLowerCase()}.`,
      groups: [{ id: uid(), name: "Security controls and assurance" }],
    };
    a.domains.push(d);
    for (const [
      name,
      current,
      target,
      evidence,
      action,
      risk,
      criterion,
      priority,
      weight,
    ] of domain.controls) {
      const c = capability(d.id, d.groups[0].id);
      Object.assign(c, {
        name,
        description: criterion,
        current,
        target,
        owner: domain.owner,
        evidence: `Fictional October 2026 review: ${evidence}`,
        recommendations: action,
        risks: risk,
        priority,
        weight,
        due: priority === "High" ? "2026-12-18" : "2027-01-22",
        notes: `Illustrative teaching data. Weight ${weight} reflects exposure and business context; it is not a probability of compromise. A maturity score does not prove that a control is effective. Microsoft reference guidance (reviewed October 2026): ${references.join(" | ")}`,
        criteria: [
          {
            id: uid(),
            text: criterion,
            met: typeof current === "number" && current >= 3,
            evidence: `Illustrative review: ${evidence}`,
          },
          {
            id: uid(),
            text: "Retain dated positive and negative test evidence for representative identities or workloads, and assign an owner to every exception.",
            met: false,
            evidence:
              current === null
                ? "Not assessed; evidence collection is outstanding."
                : "The fictional review identified incomplete test or exception evidence; remediation is required.",
          },
        ],
      });
      a.capabilities.push(c);
    }
  }
  for (const [date, label, decrement] of [
    ["2026-04-24", "April security baseline", 1],
    ["2026-07-24", "July security review", 0],
  ] as const) {
    const past = clone(a);
    past.date = date;
    past.description = `Fictional ${label.toLowerCase()} for Alderbridge Services; retained independently from the October assessment.`;
    past.capabilities.forEach((c, i) => {
      if (typeof c.current === "number")
        c.current = Math.max(
          1,
          c.current - (decrement || (i % 3 === 0 ? 1 : 0)),
        );
      c.evidence = `Fictional ${label.toLowerCase()}: adoption was under review; the October observations are not evidence for this earlier date.`;
      c.criteria.forEach((item) => {
        item.met = false;
        item.evidence =
          "Historical demonstration only; consistent control operation was not verified at this review.";
      });
    });
    a.snapshots.push(snapshot(past, label, date));
  }
  return a;
}
