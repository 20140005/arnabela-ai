# Arnabela

### Test your idea before the market does.

**Arnabela** is an AI-powered customer simulation platform that lets businesses test products, advertisements, offers, pricing ideas, and business concepts with **100 distinct simulated customer perspectives** before committing real-world time and money.

Instead of launching an idea and waiting for the market to respond, Arnabela creates a controlled simulation where different customer profiles independently evaluate the same idea, explains what drives their decisions, and recommends what to test next.

> **100 different perspectives → 100 different decisions → one clearer direction.**

---

## 🚀 Live Demo

**Try Arnabela:**  
https://arnabela-ai.vercel.app

**GitHub Repository:**  
https://github.com/20140005/arnabela-ai

---

## The Problem

Businesses often make important decisions without enough customer feedback.

Traditional market research can be:

- Expensive
- Slow
- Difficult to repeat
- Difficult to run for every product variation
- Too resource-intensive for early-stage experimentation

This creates a common problem:

> Businesses often discover what customers think **after** spending significant time and money building and launching something.

We wanted to explore a different possibility:

**What if businesses could simulate a diverse customer audience, understand why they responded the way they did, change the idea, and test the change again — before going to market?**

That is the idea behind Arnabela.

---

# 💡 What Arnabela Does

A business provides information about an idea, such as:

- Product or concept name
- Description
- Price
- Target market
- Key features

Arnabela then evaluates the idea through **100 distinct simulated customer perspectives**.

The platform produces both individual and aggregate insights, including:

- Customer decisions
- Purchase interest
- Purchase intent
- Price acceptance
- Trust
- Positive factors
- Objections
- Concerns
- Questions
- Decision reasoning
- Decision drivers
- Segment-level patterns

The result is not just a single score.

Arnabela helps answer:

> **Who likes the idea?**

> **Who doesn't?**

> **Why?**

> **What is holding customers back?**

> **What should be changed?**

> **Did the change actually improve the response?**

---

# 🔬 The Arnabela Experiment Loop

Arnabela is built around a continuous experimentation loop:

```text
IDEA
  ↓
100 CUSTOMER PERSPECTIVES
  ↓
SIMULATION
  ↓
INSIGHTS
  ↓
RECOMMENDATION
  ↓
VERSION 2
  ↓
RETEST WITH THE SAME CUSTOMERS
  ↓
COMPARE RESULTS
  ↓
LEARN
```

This makes Arnabela more than an AI feedback tool.

It becomes an **AI-powered experimentation system**.

The goal is to help businesses move from:

**"What should we do?"**

to:

**"Let's test it."**

---

# 👥 100 Distinct Customer Perspectives

Arnabela does not simply ask the same AI prompt 100 times.

The system contains **100 structured customer profiles** across **10 behavioural archetypes**.

### Customer Archetypes

1. **Budget-Focused Buyer**
2. **Premium Value Buyer**
3. **Tech Enthusiast**
4. **Risk-Averse Researcher**
5. **Convenience-First Buyer**
6. **Family-Focused Buyer**
7. **Sustainability-Focused Buyer**
8. **Brand-Loyal Buyer**
9. **Impulse Early Adopter**
10. **Practical Skeptical Buyer**

Each archetype contains multiple individual customer profiles with different behavioural characteristics.

This means two customers evaluating the same product can reach completely different conclusions for meaningful reasons.

The objective is not to create 100 different names.

The objective is to create **100 different decision-making perspectives**.

---

# 🧠 Customer Explorer

Arnabela allows users to move beyond aggregate statistics and inspect individual simulated customer perspectives.

For each customer, the platform can provide:

- Customer profile
- Behavioural characteristics
- Purchase decision
- Overall interest
- Trust
- Price acceptance
- Purchase intent
- Positive factors
- Concerns
- Questions
- Decision reasoning

This makes the simulation more transparent.

Instead of seeing only:

> **42% BUY**

a business can investigate **why different customer perspectives reached different decisions**.

---

# 📊 Decision Drivers

Arnabela analyses the simulation to identify the factors influencing customer decisions.

Examples include:

- Product fit
- Convenience
- Price pressure
- Trust
- Perceived risk
- Need for more information
- Sustainability
- Family relevance
- Value perception
- Differentiation

This helps businesses move beyond:

> "Customers don't like it."

towards:

> "Customers are interested, but price pressure is preventing more of them from moving towards purchase."

That distinction is critical for deciding what to test next.

---

# 💡 Arnabela Insights

After analysing the simulation, Arnabela identifies an evidence-based opportunity for the next experiment.

Depending on the actual simulation results, recommendations can include:

- Test a lower price
- Lead with convenience
- Strengthen the value proposition
- Clarify how the product works
- Reduce perceived risk
- Strengthen trust
- Emphasise sustainability
- Make the differentiator clearer
- Focus on a stronger customer segment
- Strengthen a specific benefit

The recommendation is designed to respond to the **actual simulation evidence**, rather than simply repeating the most common objection.

---

# ⚡ From Insight to Experiment

Arnabela doesn't stop at recommending a change.

It can turn the recommendation into a proposed **Version 2**.

For example:

```text
VERSION 1
    ↓
Simulation
    ↓
Customers show strong interest
but significant price resistance
    ↓
ARNABELA INSIGHT
    ↓
"Test a lower price"
    ↓
VERSION 2
    ↓
User reviews the proposed change
    ↓
Retest
```

The user remains in control of the experiment and can review the proposed Version 2 before running it.

---

# ⚖️ Versus: Does the Recommendation Actually Help?

One of Arnabela's most important capabilities is the ability to test whether a recommended change produces a stronger simulated response.

Version 1 is compared against Version 2 using the **same customer IDs**.

This allows the system to measure changes in:

- BUY
- CONSIDER
- REJECT
- Purchase intent
- Customer decision transitions
- Archetype-level movement
- Decision drivers

For example:

```text
VERSION 1

BUY        42%
CONSIDER   19%
REJECT     39%

       ↓
RECOMMENDATION

       ↓

VERSION 2

BUY        51%
CONSIDER   23%
REJECT     26%
```

The comparison can then determine whether the simulated response:

- **Improved**
- **Was mixed**
- **Showed no clear improvement**
- **Had insufficient data**

This creates a complete feedback loop:

> **Simulate → Understand → Change → Retest → Compare**

---

# 🎯 Why This Is Different

Most AI tools help businesses generate content.

Arnabela uses AI for something different:

**simulating a customer audience for experimentation.**

Instead of simply asking an AI:

> "Is this a good product?"

Arnabela creates a structured audience with different behavioural characteristics and asks:

> **"How would these different customer perspectives respond, what drives those decisions, and what should we test next?"**

Then it allows the business to test the recommended change.

The key innovation is therefore not simply generating AI opinions.

It is creating a **repeatable customer experimentation workflow**.

---

# 🏗️ System Architecture

Arnabela is built as a full-stack application.

```text
┌─────────────────────────────────────┐
│             NEXT.JS                 │
│          REACT FRONTEND             │
│                                     │
│  • Product / Idea Input             │
│  • Simulation Progress              │
│  • Results Dashboard                │
│  • Customer Explorer                │
│  • Decision Drivers                 │
│  • Arnabela Insights                │
│  • Version 2                        │
│  • Versus Comparison                │
└──────────────────┬──────────────────┘
                   │
                   │ REST API
                   ▼
┌─────────────────────────────────────┐
│             FASTAPI                 │
│              BACKEND                │
│                                     │
│  • Customer Management              │
│  • Simulation Jobs                  │
│  • AI Evaluation                    │
│  • Aggregation                      │
│  • Recommendations                  │
│  • Experiment Comparison            │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          CUSTOMER ENGINE             │
│                                     │
│  100 structured customer profiles   │
│  across 10 behavioural archetypes   │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          AI EVALUATION              │
│          Google Gemini              │
└─────────────────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

## AI

- Google Gemini
- Google GenAI SDK

## Testing

- Pytest
- HTTPX
- ESLint
- Next.js production build

## Deployment

- Vercel — Frontend
- Render — Backend
- GitHub — Source Control

---

# 📁 Project Structure

```text
arnabela-ai/
│
├── backend/
│   ├── customer_data/
│   │   └── customers.json
│   │
│   ├── models/
│   ├── services/
│   ├── tests/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── compare/
│   │   ├── results/
│   │   ├── simulation/
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── customer_data/
├── docs/
└── README.md
```

---

# 🔐 Reliability & Validation

Arnabela was designed with reliability in mind rather than assuming every AI response is automatically valid.

The backend includes:

- Input validation
- Customer ID validation
- Structured response validation
- Simulation job tracking
- Progress reporting
- Retry handling
- Failure tracking
- Deterministic mock evaluation
- Aggregate result validation
- Experiment comparison validation

The final backend test suite includes automated tests covering the API, customer responses, simulation services, AI customer services, and simulation jobs.

---

# 🧪 Testing

The backend can be tested using:

```bash
python -m pytest
```

The frontend lint check can be run with:

```bash
npm run lint
```

The production frontend build can be verified with:

```bash
npm run build
```

The project was tested across the core simulation and experimentation workflow before deployment.

---

# 🤖 Mock Evaluation Mode

Arnabela includes a deterministic mock evaluation mode.

This allows the complete platform to operate without requiring an external AI API call for every simulation.

Mock mode is useful for:

- Development
- Automated testing
- Demonstrations
- Reliable deployments
- Reproducible results
- Avoiding unnecessary API usage

The mock evaluator follows the same structured response model used by the AI evaluation workflow.

This also makes it possible to demonstrate the complete Arnabela experiment loop reliably.

---

# 🚀 Running Locally

## 1. Clone the repository

```bash
git clone https://github.com/20140005/arnabela-ai.git
cd arnabela-ai
```

---

## 2. Start the Backend

```bash
cd backend
```

Create a virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

### macOS / Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
CUSTOMER_LAB_USE_MOCK=true
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

---

## 3. Start the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment variable if required:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

# 🔒 Security

API keys and environment variables should never be committed to GitHub.

The project uses environment variables for sensitive configuration.

The Gemini API key should be stored locally or in the deployment provider's secure environment-variable system.

Never place API keys directly inside frontend source code.

---

# ⚠️ Important Disclaimer

Arnabela uses **simulated customer perspectives**.

These are not real people and the results should **not** be interpreted as statistically representative market research or as a prediction of actual customer behaviour.

The simulations are designed to help businesses:

- Explore ideas
- Identify potential barriers
- Generate hypotheses
- Understand possible customer motivations
- Compare product or messaging variations
- Prioritise experiments
- Make faster decisions

Real-world customer validation remains important.

Arnabela is an experimentation and decision-support tool, not a replacement for real market research.

---

# 🌱 What We Learned

One of the biggest lessons from building Arnabela was that simply generating 100 AI responses does not create a useful customer simulation.

The customers need to behave differently for meaningful reasons.

We therefore focused on creating:

- Structured customer profiles
- Behavioural archetypes
- Consistent decision-making
- Deterministic simulation behaviour
- Aggregated decision drivers
- Evidence-based recommendations
- Repeatable experiments

We also learned that an AI recommendation becomes much more valuable when it can be **tested**.

Instead of stopping at:

> "You should change X."

Arnabela aims to continue with:

> "Let's change X and see whether the simulated audience responds differently."

---

# 🏆 Hackathon Concept

Arnabela was built around a simple question:

> **What could businesses do with AI that was previously too expensive, slow, or impractical to do repeatedly?**

Our answer was customer experimentation.

Traditional customer research can require real participants, recruitment, incentives, coordination, and significant time.

Arnabela explores whether AI can provide businesses with an additional experimentation layer:

```text
IDEA
  ↓
SIMULATED AUDIENCE
  ↓
CUSTOMER RESPONSES
  ↓
INSIGHTS
  ↓
RECOMMENDATION
  ↓
NEW VERSION
  ↓
RETEST
```

The objective is to reduce the time and cost required to learn before making real-world decisions.

---

# 🔮 Future Direction

Arnabela's architecture provides a foundation for future capabilities such as:

- Custom audience creation
- Interactive customer conversations
- Website interaction testing
- Advertisement testing
- Image and creative testing
- More advanced segment analysis
- Larger simulated audiences
- Experiment history
- Multi-version experimentation
- Deeper behavioural consistency
- Real-world validation workflows

The long-term vision is to make customer experimentation accessible before a business commits to a full launch.

---

# 📌 Project Status

**Completed Hackathon Project**

Arnabela's core workflow has been implemented and deployed:

- ✅ 100 simulated customer perspectives
- ✅ 10 behavioural archetypes
- ✅ Individual Customer Explorer
- ✅ Simulation progress tracking
- ✅ Aggregate results
- ✅ Decision Drivers
- ✅ Arnabela Insights
- ✅ Evidence-based recommendations
- ✅ Automatic Version 2 preparation
- ✅ Same-customer retesting
- ✅ Versus comparison
- ✅ Backend API
- ✅ Frontend application
- ✅ Automated testing
- ✅ Production deployment

---

# 🔗 Links

### Live Demo

https://arnabela-ai.vercel.app

### GitHub

https://github.com/20140005/arnabela-ai

---

## Arnabela

**Test your idea before the market does.**

> **100 different perspectives → 100 different decisions → one clearer direction.**