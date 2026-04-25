import os

html_content = """
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>학업 커뮤니티 개념적 ERD (강의자료 스타일)</title>
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; padding: 20px; }
        .canvas { background-color: white; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        text { font-size: 12px; font-weight: bold; pointer-events: none; }
        .key { text-decoration: underline; }
        .entity { fill: #f8cecc; stroke: #b85450; stroke-width: 2; }
        .relationship { fill: #ffffff; stroke: #82b366; stroke-width: 2; }
        .attribute { fill: #fff2cc; stroke: #d6b656; stroke-width: 1.5; }
        .line { stroke: #666; stroke-width: 1.5; }
        .label { font-size: 14px; fill: #333; font-style: italic; }
        h2 { position: absolute; top: 10px; left: 20px; color: #333; }
    </style>
</head>
<body>
    <h2>데이터베이스 04-데이터 모델링 (Peter Chen 표기법)</h2>
    <svg width="1000" height="700" class="canvas">
        <!-- Lines (Connections) -->
        <!-- User - Upload - Material -->
        <line x1="200" y1="200" x2="300" y2="200" class="line" />
        <line x1="400" y1="200" x2="500" y2="200" class="line" />
        
        <!-- User Attributes -->
        <line x1="200" y1="200" x2="130" y2="130" class="line" />
        <line x1="200" y1="200" x2="200" y2="100" class="line" />
        <line x1="200" y1="200" x2="270" y2="130" class="line" />

        <!-- Material Attributes -->
        <line x1="550" y1="200" x2="500" y2="130" class="line" />
        <line x1="550" y1="200" x2="550" y2="100" class="line" />
        <line x1="550" y1="200" x2="620" y2="130" class="line" />

        <!-- User - Belong - Group -->
        <line x1="200" y1="240" x2="200" y2="350" class="line" />
        <line x1="200" y1="450" x2="200" y2="550" class="line" />

        <!-- Entities (Rectangles) -->
        <!-- User -->
        <rect x="150" y="180" width="100" height="40" class="entity" />
        <text x="183" y="205">users</text>

        <!-- Material -->
        <rect x="500" y="180" width="100" height="40" class="entity" />
        <text x="522" y="205">materials</text>

        <!-- Group -->
        <rect x="150" y="550" width="100" height="40" class="entity" />
        <text x="180" y="575">groups</text>

        <!-- Relationships (Diamonds) -->
        <!-- Upload -->
        <polygon points="350,175 400,200 350,225 300,200" class="relationship" />
        <text x="330" y="205">업로드</text>

        <!-- Belong -->
        <polygon points="200,375 250,400 200,425 150,400" class="relationship" />
        <text x="185" y="405">가입</text>

        <!-- Attributes (Ovals) -->
        <!-- User Attributes -->
        <ellipse cx="110" cy="110" rx="40" ry="20" class="attribute" />
        <text x="95" y="115" class="key">id</text>
        
        <ellipse cx="200" cy="80" rx="45" ry="20" class="attribute" />
        <text x="175" y="85">login_id</text>

        <ellipse cx="290" cy="110" rx="40" ry="20" class="attribute" />
        <text x="268" y="115">nickname</text>

        <!-- Material Attributes -->
        <ellipse cx="480" cy="110" rx="40" ry="20" class="attribute" />
        <text x="472" y="115" class="key">id</text>

        <ellipse cx="550" cy="80" rx="40" ry="20" class="attribute" />
        <text x="535" y="85">title</text>

        <ellipse cx="630" cy="110" rx="45" ry="20" class="attribute" />
        <text x="605" y="115">category</text>

        <!-- Relationship Labels -->
        <text x="270" y="195" class="label">1</text>
        <text x="430" y="195" class="label">n</text>
        <text x="210" y="340" class="label">n</text>
        <text x="210" y="530" class="label">m</text>

    </svg>
</body>
</html>
"""

with open("erd_concept_view.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("성공: 'erd_concept_view.html' 파일이 생성되었습니다.")
"""
