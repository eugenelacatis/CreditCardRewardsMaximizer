# Old Project Ideas

These were initial project proposals for the course assignment. The instructor reviewed multiple ideas before selecting the Credit Card Rewards Maximizer.

---

## Preventative Utilities Maintenance

### Objective
This project aims to build a **Preventative Utilities Maintenance System** that helps utility companies predict equipment failures before they occur. By analyzing logs, sensor data, and external climate factors, the system will prioritize maintenance tasks, reduce outages, and optimize crew routing.

### Overview/Motivation
Utility equipment failures are costly, disruptive, and sometimes dangerous.  
This application provides a proactive solution by:

- Continuously ingesting **logs, sensor streams, and weather/climate data**.
- Running **risk assessment models** to predict potential failures.
- Producing an **optimized ranking of assets** that need attention.
- Generating **crew schedules and routing plans** to address issues efficiently.
- Delivering **reports** that explain rankings and decision-making.

The goal is to **save money, reduce downtime, and improve reliability** for utility companies.

### Planned Features

- **Multiple Agents**  
  Independent monitoring and analysis agents for different data sources.

- **Data Ingest**  
  Collect logs, IoT sensor streams, and external weather/climate data.

- **Risk Assessment**  
  Evaluate equipment condition and predict likelihood of failure.

- **Optimization**  
  Rank assets by urgency and importance of maintenance.

- **Routing**  
  Generate optimal crew schedules to service high-risk equipment.

- **Reports**  
  Provide explainable outputs for asset ranking and crew assignment.

### System Design/Architecture

- **Input Layer**: log collectors, sensor integrations, weather APIs  
- **Processing Layer**: data cleaning, risk assessment models  
- **Optimization Layer**: ranking algorithms & routing engine  
- **Output Layer**: dashboards, crew schedules, reports  

### Tech Stack

- **Programming Languages**: Python (data processing, ML), Java/Go (backend services)  
- **Data Storage**: PostgreSQL / TimescaleDB  
- **Streaming/Data Ingest**: Kafka / MQTT  
- **Optimization & Routing**: OR-Tools, linear programming  
- **Visualization**: React.js / D3.js for dashboards  

### Multiple Agents
- Data ingest: collect logs, sensor streams, and weather/climate data
- Risk assessment: evaluate failure likelihood
- Optimization: rank assets 
- Routing: generates optimal crew schedules 
- Report: explain rankings

---

## Notes from Initial Planning

**Card Rewards Maximizer**  
This application would pick the best credit card from your wallet for any purchase that would give you the most rewards.
This web application would allow the user to add their credit cards (excluding sensitive information) and the store/location they are shopping at (we will be inputting location since our initial plan is a web application)

**Multiple agents:**
- Optimization: calculates potential value for each card in terms of rewards 
- Offer intelligence: find relevant offers, benefits, rewards multiplier 
- Coordinator: synthesizes result into natural language explanation and sends final recommendation back to the user's interface 

**Question answered:** Location input will be manual (not automatic GPS).

**Preventative Utilities Maintenance**  
This application would check equipment and prioritize which ones need attention before it fails based on data. 
This application allows utility companies to save money as it would keep their equipment up and running instead of having to deal with outages.
