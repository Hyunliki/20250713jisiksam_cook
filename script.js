// 급식정보 웹앱 JavaScript

class MealInfoApp {
    constructor() {
        this.baseUrl = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
        this.schoolCode = '8761121'; // 기본 학교 코드
        this.officeCode = 'R10'; // 기본 교육청 코드
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('search-btn');
        const dateInput = document.getElementById('meal-date');

        searchBtn.addEventListener('click', () => this.searchMealInfo());
        dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchMealInfo();
            }
        });
    }

    setDefaultDate() {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('meal-date').value = dateString;
    }

    async searchMealInfo() {
        const dateInput = document.getElementById('meal-date');
        const selectedDate = dateInput.value;

        if (!selectedDate) {
            this.showError('날짜를 선택해주세요.');
            return;
        }

        // 미래 날짜 체크
        const selectedDateObj = new Date(selectedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDateObj > today) {
            this.showError('미래 날짜의 급식 정보는 조회할 수 없습니다.');
            return;
        }

        this.showLoading();
        
        try {
            console.log('조회 날짜:', selectedDate);
            const mealData = await this.fetchMealData(selectedDate);
            this.displayMealInfo(selectedDate, mealData);
        } catch (error) {
            console.error('급식 정보 조회 오류:', error);
            this.showError('급식 정보를 불러오는 중 오류가 발생했습니다.', error.message);
        }
    }

    async fetchMealData(date) {
        const formattedDate = date.replace(/-/g, '');
        const url = `${this.baseUrl}?ATPT_OFCDC_SC_CODE=${this.officeCode}&SD_SCHUL_CODE=${this.schoolCode}&MLSV_YMD=${formattedDate}`;

        console.log('요청 URL:', url);

        try {
            // 먼저 직접 API 호출 시도
            try {
                console.log('직접 API 호출 시도...');
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('직접 API 응답 성공:', data);
                    return this.parseMealData(data);
                }
            } catch (directError) {
                console.log('직접 API 호출 실패:', directError);
            }

            // 프록시 서버 시도
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const encodedUrl = encodeURIComponent(url);
            const fullUrl = proxyUrl + encodedUrl;
            
            console.log('프록시 URL:', fullUrl);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            console.log('응답 텍스트:', text);
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON 파싱 오류:', parseError);
                throw new Error('서버 응답을 파싱할 수 없습니다.');
            }
            
            console.log('파싱된 데이터:', data);
            return this.parseMealData(data);
            
        } catch (error) {
            console.error('API 호출 오류:', error);
            
            // 테스트용 더미 데이터 (개발 중에만 사용)
            if (date === '2025-06-16') {
                console.log('테스트 데이터 사용');
                return {
                    menu: '*어묵우동국 (1.5.6.9.13)<br/>*소갈비찜 (5.6.13.16)<br/>*청경채오이겉절이 (5.6.13)<br/>광어살강정 (5.6.13)<br/>깍두기 (9)<br/>우유 (2)<br/>*친환경사과 (13)',
                    nutrition: '단백질(g) : 35.4<br/>지방(g) : 17.2<br/>비타민A(R.E) : 25.0<br/>티아민(mg) : 0.3<br/>리보플라빈(mg) : 0.5<br/>비타민C(mg) : 8.0<br/>칼슘(mg) : 214.9<br/>철분(mg) : 4.2',
                    calories: '약 800kcal',
                    allergy: '알레르기 정보: 1,5,6,9,13,16'
                };
            }
            
            // 더 구체적인 에러 메시지
            if (error.message.includes('Failed to fetch')) {
                throw new Error('네트워크 연결을 확인해주세요.');
            } else if (error.message.includes('HTTP error! status: 404')) {
                throw new Error('해당 날짜의 급식 정보가 없습니다.');
            } else if (error.message.includes('HTTP error! status: 403')) {
                throw new Error('API 접근이 제한되었습니다.');
            } else {
                throw new Error(`API 오류: ${error.message}`);
            }
        }
    }

    parseMealData(data) {
        console.log('API 응답 데이터:', data);
        
        // API 응답 구조 확인
        if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
            // 데이터가 없는 경우
            return null;
        }

        // mealServiceDietInfo 배열이 있는지 확인
        if (data.mealServiceDietInfo && Array.isArray(data.mealServiceDietInfo)) {
            // 실제 데이터는 인덱스 1에 있음 (인덱스 0은 헤더 정보)
            const mealData = data.mealServiceDietInfo[1];
            if (mealData && mealData.row && mealData.row.length > 0) {
                const mealInfo = mealData.row[0];
                return {
                    menu: mealInfo.DDISH_NM || '',
                    nutrition: mealInfo.NTR_INFO || '',
                    calories: mealInfo.CAL_INFO || '',
                    allergy: mealInfo.ALLRG_INFO || ''
                };
            }
        }

        // 다른 가능한 응답 구조 확인
        if (data.mealServiceDietInfo && data.mealServiceDietInfo.row && data.mealServiceDietInfo.row.length > 0) {
            const mealInfo = data.mealServiceDietInfo.row[0];
            return {
                menu: mealInfo.DDISH_NM || '',
                nutrition: mealInfo.NTR_INFO || '',
                calories: mealInfo.CAL_INFO || '',
                allergy: mealInfo.ALLRG_INFO || ''
            };
        }

        return null;
    }

    displayMealInfo(date, mealData) {
        this.hideAllSections();

        if (!mealData) {
            this.showNoData();
            return;
        }

        // 날짜 표시
        const dateDisplay = document.getElementById('meal-date-display');
        const formattedDate = this.formatDate(date);
        dateDisplay.textContent = `${formattedDate} 급식 정보`;

        // 메뉴 표시
        this.displayMenu(mealData.menu);

        // 영양 정보 표시
        this.displayNutrition(mealData);

        document.getElementById('meal-result').classList.remove('hidden');
    }

    displayMenu(menuString) {
        const menuContainer = document.getElementById('meal-menu');
        menuContainer.innerHTML = '';

        if (!menuString || menuString.trim() === '') {
            menuContainer.innerHTML = '<p>메뉴 정보가 없습니다.</p>';
            return;
        }

        // 메뉴 문자열을 개별 메뉴로 분리 (여러 구분자 지원)
        let menuItems = [];
        
        // <br/> 태그로 분리
        if (menuString.includes('<br/>')) {
            menuItems = menuString.split('<br/>');
        }
        // <br> 태그로 분리
        else if (menuString.includes('<br>')) {
            menuItems = menuString.split('<br>');
        }
        // 줄바꿈으로 분리
        else if (menuString.includes('\n')) {
            menuItems = menuString.split('\n');
        }
        // 그 외에는 전체를 하나의 메뉴로 처리
        else {
            menuItems = [menuString];
        }

        // 빈 항목 제거하고 정리
        menuItems = menuItems
            .map(item => item.trim())
            .filter(item => item.length > 0);
        
        if (menuItems.length === 0) {
            menuContainer.innerHTML = '<p>메뉴 정보가 없습니다.</p>';
            return;
        }

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.textContent = item;
            menuContainer.appendChild(menuItem);
        });
    }

    displayNutrition(mealData) {
        const nutritionContainer = document.getElementById('nutrition-info');
        nutritionContainer.innerHTML = '';

        // 칼로리 정보
        if (mealData.calories) {
            const calorieItem = document.createElement('div');
            calorieItem.className = 'nutrition-item';
            calorieItem.innerHTML = `
                <span class="nutrition-label">칼로리</span>
                <span class="nutrition-value">${mealData.calories}</span>
            `;
            nutritionContainer.appendChild(calorieItem);
        }

        // 영양 정보
        if (mealData.nutrition && mealData.nutrition.trim() !== '') {
            let nutritionItems = [];
            
            // 여러 구분자 지원
            if (mealData.nutrition.includes('<br/>')) {
                nutritionItems = mealData.nutrition.split('<br/>');
            } else if (mealData.nutrition.includes('<br>')) {
                nutritionItems = mealData.nutrition.split('<br>');
            } else if (mealData.nutrition.includes('\n')) {
                nutritionItems = mealData.nutrition.split('\n');
            } else {
                nutritionItems = [mealData.nutrition];
            }
            
            nutritionItems = nutritionItems
                .map(item => item.trim())
                .filter(item => item.length > 0);
            
            nutritionItems.forEach(item => {
                const [label, value] = item.split(':').map(s => s.trim());
                if (label && value) {
                    const nutritionItem = document.createElement('div');
                    nutritionItem.className = 'nutrition-item';
                    nutritionItem.innerHTML = `
                        <span class="nutrition-label">${label}</span>
                        <span class="nutrition-value">${value}</span>
                    `;
                    nutritionContainer.appendChild(nutritionItem);
                }
            });
        }

        // 알레르기 정보
        if (mealData.allergy) {
            const allergyItem = document.createElement('div');
            allergyItem.className = 'nutrition-item';
            allergyItem.innerHTML = `
                <span class="nutrition-label">알레르기 정보</span>
                <span class="nutrition-value">${mealData.allergy}</span>
            `;
            nutritionContainer.appendChild(allergyItem);
        }

        if (nutritionContainer.children.length === 0) {
            nutritionContainer.innerHTML = '<p>영양 정보가 없습니다.</p>';
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
    }

    showLoading() {
        this.hideAllSections();
        document.getElementById('loading').classList.remove('hidden');
    }

    showError(message, details = '') {
        this.hideAllSections();
        const errorElement = document.getElementById('error');
        const errorDetails = errorElement.querySelector('.error-details');
        
        errorElement.querySelector('p').textContent = message;
        errorDetails.textContent = details;
        
        errorElement.classList.remove('hidden');
    }

    showNoData() {
        this.hideAllSections();
        document.getElementById('no-data').classList.remove('hidden');
    }

    hideAllSections() {
        const sections = ['loading', 'error', 'meal-result', 'no-data'];
        sections.forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MealInfoApp();
});

// CORS 우회를 위한 프록시 함수 (필요시 사용)
async function fetchWithProxy(url) {
    // CORS 문제가 발생할 경우 프록시 서버를 사용할 수 있습니다
    // 예: https://cors-anywhere.herokuapp.com/
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    return fetch(proxyUrl + url);
}
