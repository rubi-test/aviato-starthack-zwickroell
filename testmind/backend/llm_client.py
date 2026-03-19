"""LLM client abstraction — supports OpenAI and Anthropic with tool use.

Switch provider via LLM_PROVIDER env var ("openai" or "anthropic").
"""

import os
import json
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

SYSTEM_PROMPT = """You are TestMind, a senior materials testing engineer AI assistant. You help
junior engineers understand test data from ZwickRoell machines. Always:
- Answer in clear, practical engineering language (not data-science jargon)
- Reference specific numbers and comparisons
- Explain what the numbers mean for quality/safety
- If a parameter is missing and essential, ask ONE clarifying question
- When comparing machines or sites, always mention practical implications
- "My local plant" means the site from context.default_site (default: Ulm)
- When presenting results, be specific about what you found and what it means
- Keep answers concise but complete — a few sentences, not paragraphs
- Format your responses using Markdown: use **bold** for key values and material names, use bullet points for lists, use ### headings to organize sections when the answer has multiple parts
- IMPORTANT: Always start your response with a single plain-language summary sentence on its own line, followed by a blank line, then the detailed analysis. The summary should be non-technical and understandable by anyone (e.g. "This material's strength is holding steady and looks healthy." or "There's a noticeable downward trend that may need attention.")

## Chart and Visualization Rules — CRITICAL

NEVER suggest the user make a chart themselves in Excel, Python, or any other tool.
NEVER say things like "you could plot this in Excel" or "here's how to visualize it in Python".
NEVER fabricate or embed image URLs, placeholder images, or markdown image syntax (![...](...)) — charts are rendered automatically by the system when you call a tool.
When a user asks for a chart, graph, trend, plot, histogram, or visualization — ALWAYS call the appropriate tool to produce it directly.

Use this mapping to decide which tool to call:
- "show trend / how has X changed over time / is X declining or improving" → call trend_analysis
- "compare X vs Y / difference between machines or materials" → call compare_groups
- "will X reach a limit / forecast / when will it violate" → call boundary_forecast
- "correlation / relationship between X and Y" → call correlate_properties
- "does it meet spec / compliance / pass rate" → call check_compliance
- "histogram / distribution / how are values spread / frequency of values" → call distribution_analysis
- "show me the tests / list results / filter by date or customer" → call filter_tests
- "summarize / what are the properties of material X" → call summarize_material_properties

If the request is ambiguous, pick the closest matching tool and call it.
Only decline to show a chart if the request is genuinely impossible (e.g. asks for data that does not exist in the database at all) — in that case, explain clearly what data is missing."""

TOOL_SCHEMAS_OPENAI = [
    {
        "type": "function",
        "function": {
            "name": "filter_tests",
            "description": "Search and filter tests by metadata (test type, customer, material, tester, machine, site, date range). Returns matching test results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "test_type": {"type": "string", "enum": ["tensile", "compression", "charpy"], "description": "Type of test"},
                    "customer": {"type": "string", "description": "Customer name"},
                    "material": {"type": "string", "description": "Material name"},
                    "tester": {"type": "string", "description": "Tester name"},
                    "machine": {"type": "string", "description": "Machine name (Z05, Z20, Z100)"},
                    "site": {"type": "string", "description": "Site name (Ulm, Kennesaw)"},
                    "date": {"type": "string", "description": "Specific date in DD.MM.YYYY format"},
                    "date_from": {"type": "string", "description": "Start date in DD.MM.YYYY format"},
                    "date_to": {"type": "string", "description": "End date in DD.MM.YYYY format"},
                    "limit": {"type": "integer", "description": "Max results to return", "default": 50},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_material_properties",
            "description": "Get statistical summary (mean, std, min, max) of all measured properties for a specific material.",
            "parameters": {
                "type": "object",
                "properties": {
                    "material": {"type": "string", "description": "Material name to summarize"},
                },
                "required": ["material"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_groups",
            "description": "Statistical comparison (t-test) between two groups for a given property. Groups can be materials, machines, or sites.",
            "parameters": {
                "type": "object",
                "properties": {
                    "group_type": {"type": "string", "enum": ["material", "machine", "site"], "description": "What to compare by"},
                    "group_a": {"type": "string", "description": "First group name"},
                    "group_b": {"type": "string", "description": "Second group name"},
                    "property": {"type": "string", "description": "Property column name to compare (e.g. tensile_strength_mpa, tensile_modulus_mpa, elongation_at_break_pct, impact_energy_j, max_force_n, or any property in the database)"},
                    "date_from": {"type": "string", "description": "Start date filter (DD.MM.YYYY)"},
                    "date_to": {"type": "string", "description": "End date filter (DD.MM.YYYY)"},
                },
                "required": ["group_type", "group_a", "group_b", "property"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "trend_analysis",
            "description": "Detect trends over time for a material property. Shows monthly averages and linear regression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "property": {"type": "string", "description": "Property column name to analyze (e.g. tensile_strength_mpa, tensile_modulus_mpa, elongation_at_break_pct, impact_energy_j, max_force_n, or any property in the database)"},
                    "material": {"type": "string", "description": "Material name"},
                    "site": {"type": "string", "description": "Site filter"},
                    "months_back": {"type": "integer", "description": "How many months of history to analyze", "default": 12},
                },
                "required": ["property"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "boundary_forecast",
            "description": "Forecast if a material property will cross a specified boundary/limit value based on current trends.",
            "parameters": {
                "type": "object",
                "properties": {
                    "material": {"type": "string", "description": "Material name"},
                    "property": {"type": "string", "description": "Property column name to forecast (e.g. tensile_strength_mpa, tensile_modulus_mpa, elongation_at_break_pct, impact_energy_j, max_force_n, or any property in the database)"},
                    "boundary_value": {"type": "number", "description": "The boundary/limit value to check against"},
                    "months_history": {"type": "integer", "description": "Months of history to use", "default": 12},
                    "months_forecast": {"type": "integer", "description": "Months into the future to forecast", "default": 24},
                },
                "required": ["material", "property", "boundary_value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "correlate_properties",
            "description": "Find the statistical correlation between two material properties. Answers: 'If property X changes, does property Y tend to change with it?' Use for questions about relationships between measurements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "property_x": {"type": "string", "description": "First property column name (X axis), e.g. tensile_strength_mpa or any property in the database"},
                    "property_y": {"type": "string", "description": "Second property column name (Y axis), e.g. elongation_at_break_pct or any property in the database"},
                    "material": {"type": "string", "description": "Optional: limit to a specific material"},
                    "test_type": {"type": "string", "enum": ["tensile", "compression", "charpy"], "description": "Optional: limit to a specific test type"},
                },
                "required": ["property_x", "property_y"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "distribution_analysis",
            "description": "Show the distribution (histogram) of a property's values for a material. Use when the user asks for a histogram, distribution, spread, frequency, or 'how are values distributed'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "property": {"type": "string", "description": "Property column name (e.g. tensile_strength_mpa, max_force_n, or any property in the database)"},
                    "material": {"type": "string", "description": "Optional: limit to a specific material"},
                    "n_bins": {"type": "integer", "description": "Number of histogram bins (default 10)", "default": 10},
                },
                "required": ["property"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_compliance",
            "description": "Check if test results for a material meet an internal specification or guideline threshold. Returns pass rate and non-compliant tests.",
            "parameters": {
                "type": "object",
                "properties": {
                    "material": {"type": "string", "description": "Material name"},
                    "property": {"type": "string", "description": "Property column name to check compliance for (e.g. tensile_strength_mpa, tensile_modulus_mpa, elongation_at_break_pct, impact_energy_j, max_force_n, or any property in the database)"},
                    "threshold_value": {"type": "number", "description": "The minimum or maximum acceptable value"},
                    "direction": {"type": "string", "enum": ["above", "below"], "description": "'above' = must be >= threshold (minimum spec). 'below' = must be <= threshold (maximum spec)."},
                },
                "required": ["material", "property", "threshold_value"],
            },
        },
    },
]

# Map tool names to chart types
TOOL_CHART_MAP = {
    "filter_tests": "table",
    "summarize_material_properties": "table",
    "compare_groups": "stat_cards",
    "trend_analysis": "time_series",
    "boundary_forecast": "forecast",
    "correlate_properties": "scatter",
    "check_compliance": "compliance",
    "distribution_analysis": "histogram",
}


def _execute_tool(name: str, args: dict) -> dict:
    """Execute a tool by name and return its result."""
    from tools.filter_tests import filter_tests
    from tools.summarize_material import summarize_material_properties
    from tools.compare_groups import compare_groups
    from tools.trend_analysis import trend_analysis
    from tools.boundary_forecast import boundary_forecast
    from tools.correlate_properties import correlate_properties
    from tools.check_compliance import check_compliance
    from tools.distribution_analysis import distribution_analysis

    tool_map = {
        "filter_tests": filter_tests,
        "summarize_material_properties": summarize_material_properties,
        "compare_groups": compare_groups,
        "trend_analysis": trend_analysis,
        "boundary_forecast": boundary_forecast,
        "correlate_properties": correlate_properties,
        "check_compliance": check_compliance,
        "distribution_analysis": distribution_analysis,
    }

    fn = tool_map.get(name)
    if not fn:
        return {"result": {"error": f"Unknown tool: {name}"}, "steps": []}
    return fn(**args)


def _generate_followups_openai(answer: str, tool_name: str, tool_result: dict) -> list[str]:
    """Generate 3 follow-up question suggestions using OpenAI."""
    try:
        from openai import OpenAI
        client = OpenAI()
        prompt = (
            f"A materials testing engineer just received this analysis result:\n\n"
            f"Tool used: {tool_name}\n"
            f"Answer: {answer[:500]}\n\n"
            f"Suggest exactly 3 concise follow-up questions the engineer might ask next. "
            f"Return ONLY a JSON array of 3 strings, no explanation. "
            f"Example: [\"Question 1?\", \"Question 2?\", \"Question 3?\"]"
        )
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=200,
        )
        content = resp.choices[0].message.content.strip()
        # Extract JSON array
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
    except Exception:
        pass
    return []


def _chat_openai(messages: list[dict], context: dict) -> dict:
    """Chat using OpenAI with tool use."""
    from openai import OpenAI

    client = OpenAI()

    system_msg = SYSTEM_PROMPT
    if context.get("default_site"):
        system_msg += f"\n\nThe user's local plant/site is: {context['default_site']}"

    api_messages = [{"role": "system", "content": system_msg}] + messages

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        messages=api_messages,
        tools=TOOL_SCHEMAS_OPENAI,
        temperature=0.3,
    )

    msg = response.choices[0].message

    # If model wants to use a tool
    if msg.tool_calls:
        tool_call = msg.tool_calls[0]
        tool_name = tool_call.function.name
        tool_args = json.loads(tool_call.function.arguments)

        tool_result = _execute_tool(tool_name, tool_args)

        # Send tool result back for natural language response
        api_messages.append(msg.model_dump())
        api_messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(tool_result),
        })

        followup = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=api_messages,
            temperature=0.3,
        )

        answer = followup.choices[0].message.content
        followups = _generate_followups_openai(answer, tool_name, tool_result["result"])
        return {
            "answer": answer,
            "tool_used": tool_name,
            "tool_result": tool_result["result"],
            "steps": tool_result.get("steps", []),
            "chart_type": TOOL_CHART_MAP.get(tool_name, "text"),
            "chart_data": tool_result["result"],
            "suggested_followups": followups,
        }

    # No tool used — direct answer
    return {
        "answer": msg.content,
        "tool_used": None,
        "tool_result": None,
        "steps": [],
        "chart_type": None,
        "chart_data": None,
        "suggested_followups": [],
    }


def _chat_anthropic(messages: list[dict], context: dict) -> dict:
    """Chat using Anthropic Claude with tool use."""
    import anthropic

    client = anthropic.Anthropic()

    system_msg = SYSTEM_PROMPT
    if context.get("default_site"):
        system_msg += f"\n\nThe user's local plant/site is: {context['default_site']}"

    # Convert tool schemas from OpenAI to Anthropic format
    anthropic_tools = []
    for t in TOOL_SCHEMAS_OPENAI:
        fn = t["function"]
        anthropic_tools.append({
            "name": fn["name"],
            "description": fn["description"],
            "input_schema": fn["parameters"],
        })

    response = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        max_tokens=2048,
        system=system_msg,
        messages=messages,
        tools=anthropic_tools,
        temperature=0.3,
    )

    # Check if model wants to use a tool
    tool_use_block = next((b for b in response.content if b.type == "tool_use"), None)

    if tool_use_block:
        tool_name = tool_use_block.name
        tool_args = tool_use_block.input

        tool_result = _execute_tool(tool_name, tool_args)

        # Send tool result back
        followup_messages = messages + [
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [{
                    "type": "tool_result",
                    "tool_use_id": tool_use_block.id,
                    "content": json.dumps(tool_result),
                }],
            },
        ]

        followup = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=2048,
            system=system_msg,
            messages=followup_messages,
            tools=anthropic_tools,
            temperature=0.3,
        )

        answer = "".join(b.text for b in followup.content if hasattr(b, "text"))
        followups = _generate_followups_openai(answer, tool_name, tool_result["result"])
        return {
            "answer": answer,
            "tool_used": tool_name,
            "tool_result": tool_result["result"],
            "steps": tool_result.get("steps", []),
            "chart_type": TOOL_CHART_MAP.get(tool_name, "text"),
            "chart_data": tool_result["result"],
            "suggested_followups": followups,
        }

    # No tool used
    answer = "".join(b.text for b in response.content if hasattr(b, "text"))
    return {
        "answer": answer,
        "tool_used": None,
        "tool_result": None,
        "steps": [],
        "chart_type": None,
        "chart_data": None,
        "suggested_followups": [],
    }


def chat_with_tools(message: str, history: list[dict], context: dict) -> dict:
    """Main entry point — routes to the configured LLM provider.

    Args:
        message: The user's current message
        history: Previous conversation messages [{role, content}, ...]
        context: Additional context (e.g., default_site)

    Returns:
        Dict with: answer, tool_used, tool_result, steps, chart_type, chart_data
    """
    messages = list(history) + [{"role": "user", "content": message}]

    if LLM_PROVIDER == "anthropic":
        return _chat_anthropic(messages, context)
    return _chat_openai(messages, context)
