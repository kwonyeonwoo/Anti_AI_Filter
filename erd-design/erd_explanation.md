YOLO mode is enabled. All tool calls will be automatically approved.
YOLO mode is enabled. All tool calls will be automatically approved.
요청하신 조건에 따라 기존 Anti-AI Filter 프로젝트의 맥락은 완전히 배제하고, **'학업 자료 공유 및 일정 관리 커뮤니티'**를 위한 최적화된 데이터베이스 ERD를 설계해 드립니다.

본 설계는 확장성, 성능 최적화, 그리고 정규화(3NF 이상) 원칙을 준수하여 작성되었습니다.

### 📊 학업 자료 공유 및 일정 관리 커뮤니티 ERD



---

### 💡 주요 아키텍처 및 설계 포인트

**1. 정규화 (Normalization - 3NF 준수)**
* **N:M 관계 해소:** 수강 정보(`USER_COURSES`), 자료 태그(`MATERIAL_TAGS`), 스터디 그룹 참여(`STUDY_GROUP_MEMBERS`) 등 다대다 관계를 모두 매핑(교차) 테이블을 생성하여 1:N 관계로 정규화했습니다.
* **데이터 중복 제거:** 이메일, 학수번호, 태그명 등에 `UNIQUE` 제약조건(UK)을 부여하여 데이터 무결성을 보장하며 갱신 이상(Update Anomaly)을 방지합니다.

**2. 성능 최적화 (Performance Optimization)**
* **Surrogate Key (대체키) 사용:** 모든 주요 테이블의 PK는 `bigint` 타입의 Auto Increment 제약을 사용하여, 복합키가 조인에 사용될 때 발생할 수 있는 인덱스 비대화와 조인 성능 저하를 예방했습니다.
* **카운터 분리 고려 (향후 확장성):** 현재는 `MATERIALS` 테이블 내에 `view_count`, `download_count`가 포함되어 있으나, 트래픽이 거대해질 경우 이를 별도의 캐시(Redis)나 Log 테이블로 분리하여 비동기 처리(Batch Update) 할 수 있도록 확장 가능한 구조를 채택했습니다.

**3. 유연성과 확장성 (Flexibility & Scalability)**
* **통합형 일정 구조 (Unified Schedule Structure):** 
  * `SCHEDULES` 테이블 하나로 '개인 일정', '강의 스케줄(시험/과제)', '스터디 모임'을 모두 수용합니다.
  * `schedule_type` 열과 Nullable FK(`user_id`, `course_id`, `group_id`) 조합을 통해, 테이블을 무한정 늘리지 않고도 다양한 형태의 캘린더 이벤트를 통합 조회할 수 있어 쿼리가 매우 효율적입니다. (예: 특정 유저의 달력을 렌더링할 때 UNION 쿼리 없이 단일 테이블 조회 및 조인으로 해결 가능).
* **파일 분산 저장 준비:** `MATERIALS` 테이블에 실제 바이너리가 아닌 `file_url`, `file_type`, `size_bytes` 메타데이터만 저장하여 AWS S3와 같은 객체 스토리지 시스템과 완벽하게 호환되도록 설계했습니다.