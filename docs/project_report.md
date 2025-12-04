---
title: "Credit Card Rewards Maximizer: AI-Powered Optimization System"
documentclass: article
classoption: twocolumn
geometry: margin=0.75in
---


## Authors

**Eugene Lacatis**  
Master's in Software Engineering  
San Jose State University  
eugene.lacatis@sjsu.edu

**Irwin Salamanca**  
Master's in Software Engineering  
San Jose State University   
irwin.salamanca@sjsu.edu

**Matt Tang**  
Master's in Software Engineering  
San Jose State University  
matthew.tang@sjsu.edu

**Atharva Prasanna Mokashi**  
Master's in Software Engineering  
San Jose State University  
atharvaprasanna.mokashi@sjsu.edu

---

## Abstract

The Credit Card Rewards Maximizer is an AI-powered mobile application designed to help users maximize their credit card rewards by recommending the optimal card for every purchase. Leveraging Llama 3 AI through Groq's API and built with FastAPI and React Native, the system analyzes user credit card portfolios in real-time to provide personalized recommendations based on merchant, amount, category, and optimization goals. The application features comprehensive analytics, transaction tracking, and agentic AI capabilities that learn from user behavior to improve recommendations over time. This paper details the system architecture, implementation, testing strategies, and technologies employed in building this intelligent financial optimization tool.

**Index Terms:** Credit Card Optimization, Artificial Intelligence, Llama 3, Rewards Maximization, Financial Technology, Mobile Application, FastAPI, React Native, PostgreSQL, Groq API, Machine Learning, Personalized Recommendations, Transaction Analytics, Agentic AI, LangChain, Docker, Cloud Computing.

---

## I. Introduction

In today's consumer landscape, credit card rewards programs have become increasingly complex, with multiple cards offering varying rewards rates across different spending categories. The average American owns 3-4 credit cards, yet most consistently use only one or two, leaving significant rewards value unclaimed. Manually tracking which card offers the best rewards for each purchase is mentally exhausting and impractical for daily transactions.

The Credit Card Rewards Maximizer addresses this challenge by providing an intelligent, AI-powered solution that instantly recommends the optimal credit card for every purchase. By analyzing the user's credit card portfolio, transaction details, and personal optimization goals (cash back, travel points, or balanced rewards), the system ensures users never miss an opportunity to maximize their rewards.

The application combines modern mobile technology with advanced AI to deliver recommendations in under 2 seconds, making optimal card selection effortless. Beyond simple recommendations, the system provides comprehensive analytics showing total savings, best-performing cards, spending patterns, and missed opportunities, empowering users to make data-driven financial decisions.

## II. System Architecture

The Credit Card Rewards Maximizer employs a modern, scalable microservices architecture designed for high performance and reliability. The system is containerized using Docker and can be deployed across multiple environments.

> **Fig. 1.** System Architecture Diagram *(Image not included)*

### A. Frontend (React Native with Expo)

The frontend is built using React Native with Expo, enabling true cross-platform development for iOS, Android, and web from a single codebase. The application features:

- **Transaction Input Screen**: Allows users to enter merchant name, purchase amount, spending category, and optimization goal
- **Card Management Screen**: Enables users to add, edit, and manage their credit card portfolio
- **Recommendations Display**: Shows the optimal card with detailed explanations and expected rewards
- **Analytics Dashboard**: Visualizes savings trends, category breakdowns, and performance metrics

The frontend communicates with the backend via RESTful APIs, with all network requests handled through a centralized API service layer that manages authentication, error handling, and response parsing.

### B. Backend (FastAPI)

The backend is powered by FastAPI, a modern Python web framework known for its high performance and automatic API documentation. Key features include:

- **RESTful API Endpoints**: Comprehensive API for card management, recommendations, transactions, and analytics
- **Automatic Documentation**: Interactive API documentation via Swagger UI at `/docs`
- **Async Support**: Asynchronous request handling for improved performance
- **CORS Middleware**: Configured for cross-origin requests from mobile clients
- **Health Monitoring**: Health check endpoints for deployment monitoring
- **Observability**: Integrated Prometheus metrics for tracking system performance and user engagement

The backend architecture follows clean separation of concerns with dedicated modules for database operations (CRUD), AI agents, data models, and API routes.

### C. Database (PostgreSQL)

PostgreSQL serves as the primary relational database, providing:

- **User Management**: Stores user profiles and authentication data
- **Credit Card Data**: Maintains card details including rewards rates, benefits, and issuer information
- **Transaction History**: Records all transactions with recommendations and actual card usage
- **Analytics Data**: Aggregates data for performance metrics and insights
- **Behavioral Patterns**: Tracks user preferences and spending patterns for personalized recommendations

The database schema uses SQLAlchemy ORM for type-safe database operations and includes proper indexing for frequently queried fields.

### D. AI Engine (Groq + Llama 3 + LangChain)

The AI recommendation engine combines multiple technologies:

- **Groq API**: Provides ultra-fast inference for Llama 3 models
- **Llama 3**: Open-source large language model for natural language understanding and reasoning
- **LangChain**: Framework for building AI agent systems with memory and tool use
- **Agentic System**: Multi-agent architecture including behavior analysis, proactive suggestions, context awareness, planning, learning, and automation agents

The AI system analyzes transaction context, user card portfolio, and historical behavior to generate personalized recommendations with confidence scores and detailed explanations.

## III. Functionalities

The Credit Card Rewards Maximizer provides comprehensive features for rewards optimization:

### A. AI-Powered Card Recommendations

The core functionality analyzes each transaction to recommend the optimal credit card:

- **Real-time Analysis**: Processes merchant, amount, category, and optimization goal
- **Multi-factor Evaluation**: Considers cash back rates, points multipliers, annual fees, and card benefits
- **Confidence Scoring**: Provides confidence levels for each recommendation
- **Detailed Explanations**: AI-generated explanations of why a specific card was recommended
- **Alternative Options**: Shows second and third-best card options with expected values
- **Credit Score Integration**: Users provide their FICO score during registration, enabling the system to filter and display only credit cards they are likely to qualify for based on typical approval requirements

### B. Multi-Card Portfolio Management

Users can manage their entire credit card portfolio:

- **Card Addition**: Add cards with issuer, rewards structure, annual fees, and benefits
- **Rewards Configuration**: Define category-specific cash back rates and points multipliers
- **Card Activation/Deactivation**: Control which cards are considered for recommendations
- **Credit Limit Tracking**: Monitor credit limits and utilization
- **Card Details**: Store last four digits and other identifying information

### C. Transaction Tracking and History

Comprehensive transaction management:

- **Automatic Logging**: All recommendations are saved with transaction details
- **Historical Analysis**: View past transactions with recommended vs. actual card used
- **Missed Opportunities**: Identify transactions where suboptimal cards were used
- **Category Breakdown**: Analyze spending patterns across categories
- **Merchant Tracking**: Track frequently visited merchants

### D. Analytics and Insights

Data-driven insights for financial optimization:

- **Total Rewards Earned**: Track cumulative cash back and points earned
- **Savings Visualization**: See potential vs. actual savings over time
- **Best Performing Cards**: Identify which cards generate the most value
- **Category Analysis**: Understand spending distribution across categories
- **Weekly Trends**: Monitor spending and rewards patterns over time
- **Optimization Rate**: Measure how often optimal recommendations are followed

### E. Behavioral Learning and Automation

Advanced agentic AI features:

- **Preference Learning**: System learns user preferences from feedback and behavior
- **Proactive Suggestions**: Identifies missed optimization opportunities
- **Automation Rules**: Create rules for automatic card selection based on conditions
- **Context Awareness**: Considers location, time, and historical patterns
- **Adaptive Recommendations**: Continuously improves based on user interactions

## IV. Persona

The system is designed for multiple user types with different needs:

### A. Individual Consumers

Primary users who want to maximize their credit card rewards:

- **Use Case**: Daily purchase optimization across multiple credit cards
- **Benefits**: Instant recommendations, automated tracking, comprehensive analytics
- **Privacy**: All data remains private and secure
- **Value**: Maximize rewards without mental overhead of tracking multiple card benefits

### B. Financial Enthusiasts

Users who actively manage their finances and want detailed insights:

- **Use Case**: Deep analysis of spending patterns and optimization opportunities
- **Benefits**: Advanced analytics, trend visualization, missed opportunity identification
- **Features**: Historical analysis, category breakdowns, performance metrics
- **Value**: Data-driven decision making for credit card portfolio optimization

### C. Credit Card Beginners

Users new to credit card rewards programs:

- **Use Case**: Learning which cards to use for different purchases
- **Benefits**: Educational explanations, simple recommendations, guided setup
- **Features**: Clear reasoning for recommendations, benefit explanations
- **Value**: Simplified rewards optimization without requiring expert knowledge

## V. Technologies Used

### A. React Native (Frontend Development)

React Native with Expo was chosen for frontend development due to:

- **Cross-Platform**: Single codebase for iOS, Android, and web
- **Hot Reload**: Fast development iteration with instant updates
- **Native Performance**: Near-native performance for mobile applications
- **Rich Ecosystem**: Extensive library support and community resources
- **Expo Tools**: Simplified build process and over-the-air updates

### B. FastAPI (Backend Development)

FastAPI provides a modern Python backend framework with:

- **High Performance**: Comparable to Node.js and Go in speed
- **Automatic Documentation**: OpenAPI/Swagger documentation generation
- **Type Safety**: Python type hints for better code quality
- **Async Support**: Native asynchronous request handling
- **Easy Testing**: Built-in testing utilities and fixtures

### C. PostgreSQL (Database Management)

PostgreSQL was selected for its:

- **Reliability**: ACID compliance and data integrity
- **JSON Support**: Native JSONB type for flexible schema elements
- **Scalability**: Handles large datasets efficiently
- **Advanced Features**: Full-text search, complex queries, indexing
- **Open Source**: No licensing costs with enterprise-grade features

### D. Groq API with Llama 3

The AI recommendation engine leverages:

- **Groq LPU**: Ultra-fast inference with Language Processing Units
- **Llama 3**: State-of-the-art open-source language model
- **Sub-2-Second Responses**: Real-time recommendations for user transactions
- **Natural Language Understanding**: Contextual analysis of transactions
- **Reasoning Capabilities**: Multi-factor decision making for optimal recommendations

### E. LangChain (AI Agent Framework)

LangChain enables sophisticated AI agent systems:

- **Agent Architecture**: Multi-agent system for different recommendation aspects
- **Memory Management**: Maintains context across interactions
- **Tool Integration**: Connects AI to external data sources and APIs
- **Prompt Engineering**: Structured prompts for consistent outputs
- **Chain Composition**: Complex workflows combining multiple AI operations

### F. Docker (Containerization)

Docker provides consistent deployment across environments:

- **Container Orchestration**: Docker Compose for multi-service setup
- **Environment Isolation**: Separate containers for backend, frontend, and database
- **Reproducible Builds**: Consistent environments across development and production
- **Easy Deployment**: Single command to start entire application stack
- **Resource Efficiency**: Lightweight containers compared to virtual machines

### G. SQLAlchemy (ORM)

SQLAlchemy provides database abstraction:

- **Type-Safe Queries**: Python objects mapped to database tables
- **Migration Support**: Schema versioning and updates
- **Relationship Management**: Automatic handling of foreign keys and joins
- **Query Optimization**: Efficient query generation and execution
- **Database Agnostic**: Easy switching between database backends

## VI. Testing

The Credit Card Rewards Maximizer underwent comprehensive testing to ensure reliability, performance, and correctness of both backend and frontend components. The testing strategy employed pytest for backend testing with a focus on unit tests, integration tests, and API endpoint validation.

### A. Backend Testing (pytest)

pytest was used for comprehensive backend testing with the following coverage:

**Unit Testing:**
- Individual CRUD operations tested in isolation
- AI agent recommendation logic validation
- Database model integrity checks
- Utility function correctness verification
- Edge case handling for invalid inputs

**Integration Testing:**
- End-to-end API endpoint testing
- Database transaction integrity
- AI service integration with Groq API
- Authentication and authorization flows
- Error handling and recovery mechanisms

**Test Coverage Areas:**
- Card management endpoints (create, read, update, delete)
- Recommendation engine with various scenarios
- Analytics calculation accuracy
- Transaction logging and retrieval
- User behavior tracking and learning
- Automation rule execution

**Testing Approach:**
- Fixtures for test data setup and teardown
- Mock external API calls (Groq) for consistent testing
- Database rollback after each test for isolation
- Parametrized tests for multiple input scenarios
- Async test support for concurrent operations

> **Fig. 2.** Backend testing code coverage *(Image not included)*

### B. Frontend Testing

Frontend testing focused on manual verification and component validation:

**Component Validation:**
- Screen rendering verification across iOS, Android, and Web
- User interaction handling (taps, swipes, inputs)
- Navigation flow testing between tabs and stacks
- Form input validation and error state display
- Responsive layout adjustments

**System Integration Testing:**
- End-to-end testing using Expo Go on physical devices
- Network request handling and error recovery
- Loading state management during AI inference
- Offline behavior and reconnection handling
- Real-time recommendation display verification

## VII. API Security

The Credit Card Rewards Maximizer implements multiple layers of security to protect sensitive financial data:

### A. Environment Variables

Sensitive configuration is managed through environment variables:

- **API Keys**: Groq API key stored in `.env` file (gitignored)
- **Database Credentials**: PostgreSQL connection strings secured
- **Secret Keys**: Application secrets for session management
- **Configuration Isolation**: Separate configs for development and production

### B. CORS Configuration

Cross-Origin Resource Sharing is properly configured:

- **Allowed Origins**: Controlled list of permitted client origins
- **Credential Support**: Secure cookie and authentication header handling
- **Method Restrictions**: Limited to required HTTP methods
- **Header Validation**: Only necessary headers allowed

### C. Input Validation

All user inputs are validated before processing:

- **Pydantic Models**: Type-safe request validation
- **Field Constraints**: Min/max values, required fields, format validation
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy ORM
- **XSS Protection**: Input sanitization for stored data
- **Amount Validation**: Positive values required for transactions

### D. Data Privacy

User financial data is protected:

- **Database Encryption**: PostgreSQL supports encryption at rest
- **HTTPS Communication**: All API calls encrypted in transit (Production)
- **No Third-Party Sharing**: User data never shared with external services
- **Minimal Data Collection**: Only necessary information stored
- **User Data Ownership**: Users can export or delete their data

### E. Error Handling

Secure error responses:

- **Generic Error Messages**: No sensitive information in error responses
- **Logging**: Detailed errors logged server-side only
- **HTTP Status Codes**: Appropriate codes for different error types
- **Graceful Degradation**: Fallback behavior when AI service unavailable

## VIII. Conclusion

The Credit Card Rewards Maximizer successfully demonstrates the application of modern AI technology to solve a real-world financial optimization problem. By combining FastAPI for the backend, React Native for cross-platform mobile development, PostgreSQL for reliable data storage, and Llama 3 AI through Groq's API for intelligent recommendations, the system delivers a comprehensive solution for maximizing credit card rewards.

The platform offers a variety of functionalities including real-time AI-powered card recommendations, comprehensive portfolio management, transaction tracking, and detailed analytics. The agentic AI architecture enables the system to learn from user behavior, provide proactive suggestions, and continuously improve recommendation quality. Users benefit from instant, data-driven decisions that eliminate the mental overhead of tracking multiple card benefits while ensuring they never miss an opportunity to maximize rewards.

The system underwent rigorous testing using pytest for backend validation, achieving comprehensive coverage of API endpoints, database operations, and AI integration. Security best practices were implemented throughout, including environment variable management, input validation, and secure data handling.

The technologies used in the project—React Native, FastAPI, PostgreSQL, Groq API, Llama 3, LangChain, and Docker—provide a modern, scalable, and maintainable foundation. The containerized architecture ensures consistent deployment across environments, while the separation of concerns enables independent scaling of frontend, backend, and database components.

Future enhancements could include machine learning models for spending prediction, integration with banking APIs for automatic transaction import, social features for comparing optimization strategies, and expanded support for additional card types and reward programs. The Credit Card Rewards Maximizer delivers a practical, efficient, and intelligent solution for consumers seeking to maximize their credit card rewards through advanced technology.

## Acknowledgment

We would like to express our sincere gratitude to all those who have contributed to the successful completion of this project. Special thanks to **Prof. Rakesh Ranjan** for continuous guidance, invaluable feedback, and support throughout the development process.

We also acknowledge the valuable suggestions from our peers, which have significantly enhanced the quality of this work. Our appreciation extends to the developers and engineers behind the technologies used in this project, including React Native, FastAPI, PostgreSQL, Groq, Meta AI (Llama 3), LangChain, and Docker, whose platforms and tools have been fundamental in building this system.

Lastly, we thank the organizations and individuals who have supported our work, providing the resources and environment to pursue this research and development.
