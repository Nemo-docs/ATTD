previous_mermaid_mistakes = """
**PREVIOUS ATTEMPTS MERMAID CODE AND VALIDATION ERROR:**
Mermaid code: ```flowchart TD
    %% Entry Points
    userInput([User Input]):::entrypoint
    
    %% Main Components
    client[Client.py\nCLI Interface]:::ui
    mcpServer[MCP Server\nmcp_server.py]:::service
    openAIapi[(OpenAI API)]:::external
    chromaDB[(ChromaDB\n"pdf_collection")]:::database

    %% Process Nodes
    clientSession{{"1. Initialize ClientSession"}}:::process
    discoverCapabilities{{"2. Discover Server Capabilities"}}:::process
    handleUserQuery{{"3. Process User Query"}}:::process
    convertToOpenAIFormat{{"4. Convert to OpenAI Format"}}:::process
    chatCompletion{{"5. Generate LLM Response"}}:::process
    handleToolCalls{{"6. Handle Tool Calls"}}:::process
    executeTools{{"7. Execute Server Tools"}}:::process
    formatResults{{"8. Format Results"}}:::process
    storeHistory{{"9. Store in Message History"}}:::process

    %% Server Capabilities
    queryDoc["query_document\nSemantic Search Tool"]:::service
    getCollectionInfo["get_collection_info\nCollection Metadata Tool"]:::service
    promptTemplates["Prompt Templates\n- deep_analysis\n- extract_key_information"]:::service
    pdfResources["PDF Resources\n./testing/*.pdf"]:::data

    %% Decision Points
    hasToolCalls{"Tool Calls\nPresent?"}:::decision
    
    %% Flow Definition
    userInput --> client
    
    client --> clientSession
    clientSession --> discoverCapabilities
    discoverCapabilities --> mcpServer
    
    mcpServer --> queryDoc
    mcpServer --> getCollectionInfo
    mcpServer --> promptTemplates
    mcpServer --> pdfResources
    
    queryDoc --> chromaDB
    getCollectionInfo --> chromaDB
    pdfResources --> queryDoc
    
    discoverCapabilities --> handleUserQuery
    handleUserQuery --> convertToOpenAIFormat
    convertToOpenAIFormat --> openAIapi
    openAIapi --> chatCompletion
    chatCompletion --> hasToolCalls
    
    hasToolCalls -->|Yes| handleToolCalls
    handleToolCalls --> executeTools
    executeTools --> mcpServer
    mcpServer --> formatResults
    formatResults --> openAIapi
    openAIapi --> storeHistory
    
    hasToolCalls -->|No| storeHistory
    storeHistory --> handleUserQuery
    
    %% Styling
    classDef entrypoint fill:#E0F2F1,stroke:#004D40,stroke-width:1px,color:black
    classDef ui fill:#E1F5FE,stroke:#01579B,stroke-width:1px,color:black
    classDef service fill:#E8F5E8,stroke:#1B5E20,stroke-width:1px,color:black
    classDef process fill:#FFFDE7,stroke:#F57F17,stroke-width:1px,color:black
    classDef database fill:#F3E5F5,stroke:#4A148C,stroke-width:1px,color:black
    classDef external fill:#FFE0B2,stroke:#E65100,stroke-width:1px,color:black
    classDef data fill:#E0F7FA,stroke:#006064,stroke-width:1px,color:black
    classDef decision fill:#FFEBEE,stroke:#B71C1C,stroke-width:1px,color:black```

Error message: ```Parse error on line 6:
...hromaDB[(ChromaDB\n"pdf_collection")]:::
-----------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'PIPE', 'CYLINDEREND', 'DIAMOND_STOP', 'TAGEND', 'TRAPEND', 'INVTRAPEND', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got 'STR'```


=================================================
Example 2
Mermaid code: ```flowchart TD
    classDef ui fill:#E1F5FE,stroke:#0D47A1,color:#0D47A1
    classDef processing fill:#FFFDE7,stroke:#F57F17,color:#F57F17
    classDef logic fill:#E8F5E8,stroke:#2E7D32,color:#2E7D32
    classDef entry fill:#E0F2F1,stroke:#00695C,color:#00695C

    Entry[("1. Entry Point\necho.py")] :::entry
    FastMCP["2. FastMCP App\n'Echo Server'"] :::logic
    EchoTool{"3. echo_tool\nData Processing"} :::processing
    StaticResource["4. Static Resource\necho://static"] :::logic
    TemplatedResource["5. Templated Resource\necho://{text}"] :::logic
    PromptHandler{"6. Prompt Handler\necho()"} :::processing
    Response["7. Response Formatting\n& Output"] :::ui
    
    Entry --> FastMCP
    FastMCP --> |"registers"| EchoTool
    FastMCP --> |"defines"| StaticResource
    FastMCP --> |"defines"| TemplatedResource
    FastMCP --> |"registers"| PromptHandler
    
    EchoTool --> |"processes input"| Response
    StaticResource --> |"returns static response"| Response
    TemplatedResource --> |"formats text parameter"| Response
    PromptHandler --> |"returns input text"| Response
    
    subgraph "FastMCP Echo Server Implementation"
        FastMCP
        EchoTool
        StaticResource
        TemplatedResource
        PromptHandler
    end```

Error message: ```Parse error on line 7:
...y Point\necho.py")] :::entry    FastMCP
-----------------------^
Expecting 'SEMI', 'NEWLINE', 'SPACE', 'EOF', 'AMP', 'COLON', 'START_LINK', 'LINK', 'LINK_ID', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'STYLE_SEPARATOR'```

=================================================
Example 3
Mermaid code: ```flowchart TD
    %% Define Nodes with Step Numbers
    Start([1. Start]) --> InputFile[2. Input File]
    InputFile --> Parser{3. Parser}
    Parser --> Lexer{4. Lexical Analysis}
    Lexer --> TokenStream[5. Token Stream]
    TokenStream --> Parsers{6. Syntax Analysis}
    Parsers --> AST[7. Abstract Syntax Tree]
    AST --> Verifier{8. Semantic Analysis}
    Verifier --> VerifiedAST[9. Verified AST]
    VerifiedAST --> Generator{10. Code Generation}
    Generator --> OutputCode[11. Output Code]
    OutputCode --> Executor{12. Execution}
    Executor --> Result([13. Result])
    
    %% Subgraphs for Components
    subgraph Frontend["Frontend - Parsing"]
        InputFile
        Parser
        Lexer
        TokenStream
        Parsers
        AST
    end
    
    subgraph MiddleEnd["Middle End - Analysis"]
        Verifier
        VerifiedAST
    end
    
    subgraph Backend["Backend - Code Gen & Execution"]
        Generator
        OutputCode
        Executor
        Result
    end
    
    %% External Connections
    Environment[(External Environment)] --> InputFile
    Executor --> Environment
    
    %% Define Styles
    classDef start fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef end fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef ui fill:#E1F5FE,stroke:#01579B,stroke-width:1px,color:black
    classDef process fill:#FFFDE7,stroke:#F57F17,stroke-width:1px,color:black
    classDef data fill:#E8F5E8,stroke:#2E7D32,stroke-width:1px,color:black
    classDef database fill:#F3E5F5,stroke:#7B1FA2,stroke-width:1px,color:black
    
    %% Apply styles
    class Start,Result start
    class InputFile ui
    class Parser,Lexer,Parsers,Verifier,Generator,Executor process
    class TokenStream,AST,VerifiedAST,OutputCode data
    class Environment database```

Error message: ```Parse error on line 37:
...t:bold    classDef end fill:#E0F2F1,str
----------------------^
Expecting 'AMP', 'COLON', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'end'```


=================================================
Example 4

```Mermaid code: ```flowchart TD
    %% Define Nodes with Step Numbers
    Start([1. Start]):::start --> InputFile[2. Input File]:::ui
    InputFile --> Parser{{3. Parser}}:::process
    Parser --> Lexer{{4. Lexical Analysis}}:::process
    Lexer --> TokenStream[5. Token Stream]:::data
    TokenStream --> Parsers{{6. Syntax Analysis}}:::process
    Parsers --> AST[7. Abstract Syntax Tree]:::data
    AST --> Verifier{{8. Semantic Analysis}}:::process
    Verifier --> VerifiedAST[9. Verified AST]:::data
    VerifiedAST --> Generator{{10. Code Generation}}:::process
    Generator --> OutputCode[11. Output Code]:::data
    OutputCode --> Executor{{12. Execution}}:::process
    Executor --> Result([13. Result]):::end
    
    %% Subgraphs for Components
    subgraph Frontend["Frontend - Parsing"]
        InputFile
        Parser
        Lexer
        TokenStream
        Parsers
        AST
    end
    
    subgraph MiddleEnd["Middle End - Analysis"]
        Verifier
        VerifiedAST
    end
    
    subgraph Backend["Backend - Code Gen & Execution"]
        Generator
        OutputCode
        Executor
    end
    
    %% External Connections
    Environment[(External Environment)]:::database --> InputFile
    Executor --> Environment
    
    %% Define Styles
    classDef start fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef end fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef ui fill:#E1F5FE,stroke:#01579B,stroke-width:1px,color:black
    classDef process fill:#FFFDE7,stroke:#F57F17,stroke-width:1px,color:black
    classDef data fill:#E8F5E8,stroke:#2E7D32,stroke-width:1px,color:black
    classDef database fill:#F3E5F5,stroke:#7B1FA2,stroke-width:1px,color:black
    
    %% Style Edge Labels
    linkStyle default stroke:#666,stroke-width:1.5px```

Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^
Expecting 'AMP', 'COLON', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'end'``

=================================================

Example 5
```Mermaid code: ```flowchart TD
    %% Define Nodes with Step Numbers
    Start([1. Start]):::start --> InputFile[2. Input File]:::ui
    InputFile --> Parser{{3. Parser}}:::process
    Parser --> Lexer{{4. Lexical Analysis}}:::process
    Lexer --> TokenStream[5. Token Stream]:::data
    TokenStream --> Parsers{{6. Syntax Analysis}}:::process
    Parsers --> AST[7. Abstract Syntax Tree]:::data
    AST --> Verifier{{8. Semantic Analysis}}:::process
    Verifier --> VerifiedAST[9. Verified AST]:::data
    VerifiedAST --> Generator{{10. Code Generation}}:::process
    Generator --> OutputCode[11. Output Code]:::data
    OutputCode --> Executor{{12. Execution}}:::process
    Executor --> Result([13. Result]):::end
    
    %% Subgraphs for Components
    subgraph Frontend["Frontend - Parsing"]
        InputFile
        Parser
        Lexer
        TokenStream
        Parsers
        AST
    end
    
    subgraph MiddleEnd["Middle End - Analysis"]
        Verifier
        VerifiedAST
    end
    
    subgraph Backend["Backend - Code Gen & Execution"]
        Generator
        OutputCode
        Executor
    end
    
    %% External Connections
    Environment[(External Environment)]:::database --> InputFile
    Executor --> Environment
    
    %% Define Styles
    classDef start fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef end fill:#E0F2F1,stroke:#00695C,stroke-width:2px,color:#00695C,font-weight:bold
    classDef ui fill:#E1F5FE,stroke:#01579B,stroke-width:1px,color:black
    classDef process fill:#FFFDE7,stroke:#F57F17,stroke-width:1px,color:black
    classDef data fill:#E8F5E8,stroke:#2E7D32,stroke-width:1px,color:black
    classDef database fill:#F3E5F5,stroke:#7B1FA2,stroke-width:1px,color:black
    
    %% Style Edge Labels
    linkStyle default stroke:#666,stroke-width:1.5px```

Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^
Expecting 'AMP', 'COLON', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'end'```

=================================================

Example 6
Mermaid code: ```flowchart TB
    %% Define styles for high contrast and readability
    classDef userInterface fill:#E1F5FE,stroke:#01579B,stroke-width:2px,color:#000
    classDef service fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef processing fill:#FFFDE7,stroke:#F57C00,stroke-width:2px,color:#000
    classDef database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#000
    classDef external fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000
    classDef entry fill:#E0F2F1,stroke:#004D40,stroke-width:2px,color:#000

    %% Entry Points
    FrontendApp[1. Frontend Next.js App] :::entry
    BackendAPI[2. Backend FastAPI] :::entry
    MCPServer[3. MCP Server] :::entry
    
    %% User Interfaces
    HomeUI[4. Home UI] :::userInterface
    RepoUI[5. Repository Setup UI] :::userInterface
    ChatUI[6. Chat QA Interface] :::userInterface
    EditorUI[7. Markdown Editor] :::userInterface
    PageManagementUI[8. Page Management UI] :::userInterface
    KeysModalUI[9. API Keys Modal] :::userInterface
    
    %% Services
    GitRepoService[10. GitRepoSetupService] :::service
    AutoGenService[11. AutoGenerationService] :::service
    ParseDefsService[12. ParseDefinitionsService] :::service
    ChatQAService[13. ChatQaService] :::service
    InlineQAService[14. InlineQnaService] :::service
    PageService[15. PageManagementService] :::service
    UserService[16. UserService] :::service
    MermaidValidator[17. MermaidGenerationValidator] :::service
    
    %% Processing Steps
    CloneRepo{18. Clone Repository} :::processing
    ParseCode{19. Parse Definitions} :::processing
    GenerateIntro{20. Generate Intro} :::processing
    GenerateDiagram{21. Generate Diagram} :::processing
    AgenticLoop{22. Run Agentic Loop} :::processing
    InlineQuery{23. Process Inline Query} :::processing
    
    %% External Services
    OpenRouter[24. OpenRouter API] :::external
    ClerkAuth[25. Clerk Auth] :::external
    
    %% Storage
    MongoDB[(26. MongoDB Database)] :::database
    S3Storage[(27. S3 Storage)] :::database
    
    %% Main App Flow
    FrontendApp --> HomeUI
    FrontendApp --> RepoUI
    FrontendApp --> ChatUI
    FrontendApp --> EditorUI
    FrontendApp --> PageManagementUI
    FrontendApp --> KeysModalUI
    
    %% Backend Services
    BackendAPI --> GitRepoService
    BackendAPI --> AutoGenService
    BackendAPI --> ParseDefsService
    BackendAPI --> ChatQAService
    BackendAPI --> InlineQAService
    BackendAPI --> PageService
    BackendAPI --> UserService
    
    %% MCP Server
    MCPServer --> PageService
    
    %% Repository Setup Flow
    RepoUI -->|28. Submit GitHub URL| CloneRepo
    CloneRepo -->|29. Process URL| GitRepoService
    GitRepoService -->|30. Generate Hash| GitRepoService
    GitRepoService -->|31. Clone Repository| GitRepoService
    GitRepoService -->|32. Zip Repository| S3Storage
    GitRepoService -->|33. Request Generation| AutoGenService
    
    %% Auto Generation Flow
    AutoGenService -->|34. Process Files| ParseCode
    ParseCode -->|35. Extract AST| ParseDefsService
    ParseDefsService -->|36. Store Definitions| MongoDB
    AutoGenService -->|37. Generate Project Intro| OpenRouter
    AutoGenService -->|38. Create Diagram| GenerateDiagram
    GenerateDiagram -->|39. Validate Syntax| MermaidValidator
    MermaidValidator -->|40. Validate via Frontend| FrontendApp
    AutoGenService -->|41. Store Results| MongoDB
    
    %% Chat QA Flow
    ChatUI -->|42. Send Question| ChatQAService
    ChatQAService -->|43. Fetch Context| MongoDB
    ChatQAService -->|44. Download Repository| S3Storage
    ChatQAService -->|45. Process Query| AgenticLoop
    AgenticLoop -->|46. Query LLM| OpenRouter
    AgenticLoop -->|47. Execute Tools| AgenticLoop
    ChatQAService -->|48. Store Conversation| MongoDB
    
    %% Inline QA Flow
    EditorUI -->|49. Context Question| InlineQuery
    InlineQuery -->|50. Process Query| InlineQAService
    InlineQAService -->|51. Generate Answer| OpenRouter
    
    %% Page Management Flow
    PageManagementUI -->|52. CRUD Operations| PageService
    PageService -->|53. Store/Retrieve Pages| MongoDB
    
    %% User Management Flow
    KeysModalUI -->|54. User Request| UserService
    UserService -->|55. Auth Verification| ClerkAuth
    UserService -->|56. Store User Data| MongoDB
    
    %% Authentication Flow
    FrontendApp -->|57. Auth Request| ClerkAuth
    BackendAPI -->|58. Verify Auth| ClerkAuth
    MCPServer -->|59. Verify Auth| ClerkAuth```

Error message: ```Parse error on line 8:
...ontend Next.js App] :::entry    Backend
-----------------------^
Expecting 'SEMI', 'NEWLINE', 'SPACE', 'EOF', 'AMP', 'COLON', 'START_LINK', 'LINK', 'LINK_ID', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'STYLE_SEPARATOR'```


=========================================
Example 7
```Mermaid code: ```flowchart TB
    %% Define styles for high contrast and readability
    classDef UI fill:#E1F5FE,stroke:#01579B,stroke-width:2px,color:#000
    classDef Service fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef Process fill:#FFFDE7,stroke:#F57C00,stroke-width:2px,color:#000
    classDef Database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#000
    classDef External fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000
    classDef Entry fill:#E0F2F1,stroke:#004D40,stroke-width:2px,color:#000

    %% Entry Points
    A[1. Frontend Next.js App] :::Entry
    B[2. Backend FastAPI] :::Entry
    
    %% User Interfaces
    C[3. Repository Setup UI] :::UI
    D[4. Chat QA Interface] :::UI
    E[5. Markdown Editor] :::UI
    F[6. Page Management UI] :::UI
    G[7. API Keys Modal] :::UI
    
    %% Services & Processing
    H{8. Git Repository Setup} :::Process
    I{9. Auto Generation} :::Process
    J{10. Parse Definitions} :::Process
    K{11. Chat QA Processing} :::Process
    L{12. Inline QA} :::Process
    M{13. Page Management} :::Process
    N{14. User Management} :::Process
    
    %% Backend Services
    O[15. GitRepoSetupService] :::Service
    P[16. AutoGenerationService] :::Service
    Q[17. ParseDefinitionsService] :::Service
    R[18. ChatQaService] :::Service
    S[19. InlineQnaService] :::Service
    T[20. PageManagementService] :::Service
    U[21. UserService] :::Service
    V[22. MermaidGenerationValidator] :::Service
    
    %% External Services
    W[23. OpenRouter API LLM Models] :::External
    X[24. Clerk Auth] :::External
    
    %% Storage
    Y[(25. MongoDB Database)] :::Database
    Z[(26. S3 Storage)] :::Database
    
    %% Data Flow - Main Application Flow
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    
    %% Repository Setup Flow
    C -->|Clone Repo Request| H
    H -->|Send GitHub URL| O
    O -->|Generate Hash| O
    O -->|Clone Repository| O
    O -->|Zip Repository| Z
    O -->|Request Generation| P
    
    %% Auto Generation Flow
    I -->|Process Files| P
    P -->|Parse Repo| P
    P -->|Extract Definitions| Q
    Q -->|Parse AST| Q
    Q -->|Store Definitions| Y
    P -->|Generate Intro| W
    P -->|Generate Diagram| V
    V -->|Validate Diagram| W
    P -->|Store Results| Y
    
    %% Chat QA Flow
    D -->|Send Question| K
    K -->|Process Query| R
    R -->|Fetch Context| Y
    R -->|Download Repo| Z
    R -->|Run Agent Loop| W
    R -->|Store Conversation| Y
    
    %% Inline QA Flow
    E -->|Context Question| L
    L -->|Process Query| S
    S -->|Generate Answer| W
    
    %% Page Management Flow
    F -->|CRUD Operations| M
    M -->|Process Request| T
    T -->|Store/Retrieve Pages| Y
    
    %% User Management Flow
    G -->|User Request| N
    N -->|Process Request| U
    U -->|Auth Verification| X
    U -->|Store User Data| Y
    
    %% External Dependencies
    B --> O
    B --> P
    B --> Q
    B --> R
    B --> S
    B --> T
    B --> U
    P --> V```

Error message: ```Parse error on line 8:
...ontend Next.js App] :::Entry    B[2. Ba
-----------------------^
Expecting 'SEMI', 'NEWLINE', 'SPACE', 'EOF', 'AMP', 'COLON', 'START_LINK', 'LINK', 'LINK_ID', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'STYLE_SEPARATOR'```


=========================================
example 8
Mermaid code: ```flowchart TB
    classDef UI fill:#E1F5FE,stroke:#0D47A1,stroke-width:2px,color:#0D47A1
    classDef Service fill:#E8F5E8,stroke:#1B5E20,stroke-width:2px,color:#1B5E20
    classDef Process fill:#FFFDE7,stroke:#F57F17,stroke-width:2px,color:#F57F17
    classDef Database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#4A148C
    classDef External fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#E65100
    classDef Entry fill:#E0F2F1,stroke:#004D40,stroke-width:2px,color:#004D40

    %% Entry Points
    A[("Frontend\nNext.js App")] :::Entry
    B[("Backend\nFastAPI")] :::Entry
    
    %% User Interfaces
    C["Repository Page UI"] :::UI
    D["Chat QA Interface"] :::UI
    E["Markdown Editor"] :::UI
    F["Page Management UI"] :::UI
    G["API Keys Modal"] :::UI
    
    %% Services
    H{"1. Git Repository Setup"} :::Process
    I{"2. Auto Generation"} :::Process
    J{"3. Parse Definitions"} :::Process
    K{"4. Chat QA Processing"} :::Process
    L{"5. Inline QA"} :::Process
    M{"6. Page Management"} :::Process
    N{"7. User Management"} :::Process
    
    %% Backend Services
    O["GitRepoSetupService"] :::Service
    P["AutoGenerationService"] :::Service
    Q["ParseDefinitionsService"] :::Service
    R["ChatQaService"] :::Service
    S["InlineQnaService"] :::Service
    T["PageManagementService"] :::Service
    U["UserService"] :::Service
    V["MermaidGenerationValidator"] :::Service
    
    %% External Services
    W[("OpenRouter API\nLLM Models")] :::External
    X[("Clerk Auth")] :::External
    
    %% Storage
    Y[("MongoDB\nDatabase")] :::Database
    Z[("S3 Storage")] :::Database
    
    %% Data Flow - Main Application Flow
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    
    %% Repository Setup Flow
    C -- "8. Clone Repo Request" --> H
    H -- "9. Send GitHub URL" --> O
    O -- "10. Generate Hash" --> O
    O -- "11. Clone Repository" --> O
    O -- "12. Zip Repository" --> Z
    O -- "13. Request Generation" --> P
    
    %% Auto Generation Flow
    I -- "14. Process Files" --> P
    P -- "15. Parse Repo" --> P
    P -- "16. Extract Definitions" --> Q
    Q -- "17. Parse AST" --> Q
    Q -- "18. Store Definitions" --> Y
    P -- "19. Generate Intro" --> W
    P -- "20. Generate Diagram" --> V
    V -- "21. Validate Diagram" --> W
    P -- "22. Store Results" --> Y
    
    %% Chat QA Flow
    D -- "23. Send Question" --> K
    K -- "24. Process Query" --> R
    R -- "25. Fetch Context" --> Y
    R -- "26. Download Repo" --> Z
    R -- "27. Run Agent Loop" --> W
    R -- "28. Store Conversation" --> Y
    
    %% Inline QA Flow
    E -- "29. Context Question" --> L
    L -- "30. Process Query" --> S
    S -- "31. Generate Answer" --> W
    
    %% Page Management Flow
    F -- "32. CRUD Operations" --> M
    M -- "33. Process Request" --> T
    T -- "34. Store/Retrieve Pages" --> Y
    
    %% User Management Flow
    G -- "35. User Request" --> N
    N -- "36. Process Request" --> U
    U -- "37. Auth Verification" --> X
    U -- "38. Store User Data" --> Y
    
    %% External Dependencies
    B --> W
    B --> X
    B --> Y
    B --> Z
    
    %% Backend Service Connections
    B --> O
    B --> P
    B --> Q
    B --> R
    B --> S
    B --> T
    B --> U
    P --> V```

Error message: ```Parse error on line 8:
...end\nNext.js App")] :::Entry    B[("Bac
-----------------------^
Expecting 'SEMI', 'NEWLINE', 'SPACE', 'EOF', 'AMP', 'COLON', 'START_LINK', 'LINK', 'LINK_ID', 'DOWN', 'DEFAULT', 'NUM', 'COMMA', 'NODE_STRING', 'BRKT', 'MINUS', 'MULT', 'UNICODE_TEXT', got 'STYLE_SEPARATOR
"""

previous_mermaid_mistakes_compressed = """

Error 1: - This error occured because of quotes inside the nodes
Error message: ```Parse error on line 6:
...hromaDB[(ChromaDB\n"pdf_collection")]:::
-----------------------^
Error 2: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 7:
...y Point\necho.py")] :::entry    FastMCP
-----------------------^

Error 3: - This error occured becuase of using reserved 'end' keyword
Error message: ```Parse error on line 37:
...t:bold    classDef end fill:#E0F2F1,str
----------------------^

Error 4: - This error occured becuase of using reserved 'end' keyword`
Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^

Error 5: - This error occured becuase of using reserved 'end' keyword
Error message: ```Parse error on line 13:
...ult([13. Result]):::end    subgraph Fro
-----------------------^

Error 6: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...ontend Next.js App] :::entry    Backend
-----------------------^
Error 7: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...ontend Next.js App] :::Entry    B[2. Ba
-----------------------^

Error 8: - This error occured because of unwanter space infront of :::
Error message: ```Parse error on line 8:
...end\nNext.js App")] :::Entry    B[("Bac
-----------------------^e

Error 9: - This error occured because of using double square brackets inside the nodes
Error: Error: Parse error on line 11:
...):::entryClientUI([[2. CLI Client]]):::
----------------------^

Error 10: - This error occured because of using curved brackets inside the nodes
Error: Error: Parse error on line 8:
...ntUI[[2. CLI Client (client.py)]]Client
-----------------------^

Error 11: - This error occured because of using curved brackets inside the nodes
Error: Error: Parse error on line 16:
...sS1[[5. MCP Server (mcp_server.py)]]:::
----------------------^

Error 12: - This error occured because of using curly braces to make nodes
Error: On line 13
MermaidDetailedError: Parse error on line 14:
...on_info:::processB5{9. Read PDF Resourc
----------------------^

"""