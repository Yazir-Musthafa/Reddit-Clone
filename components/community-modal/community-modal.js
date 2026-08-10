import { showToast } from '../../js/interactions.js';

let currentStep = 1;
let selectedTopic = '';
let communityType = 'Public';
let communityName = '';
let communityDesc = '';

export function initCommunityModal() {
    const backdrop = document.getElementById('communityModalBackdrop');
    const closeBtns = document.querySelectorAll('#btnCloseCommunityModal, .btnCloseModal');
    const topicPills = document.querySelectorAll('.topic-pill');
    const typeCards = document.querySelectorAll('.type-option-card');
    
    // Inputs
    const nameInput = document.getElementById('commNameInput');
    const descInput = document.getElementById('commDescInput');
    const nameCharCount = document.getElementById('commNameCharCount');
    const descCharCount = document.getElementById('commDescCharCount');
    const previewName = document.getElementById('previewCommName');
    const previewDesc = document.getElementById('previewDescText');

    // Navigation Buttons
    const btnNext1 = document.getElementById('btnNextStep1');
    const btnCancel1 = document.getElementById('btnCancelStep1');
    const btnBack2 = document.getElementById('btnBackStep2');
    const btnNext2 = document.getElementById('btnNextStep2');
    const btnBack3 = document.getElementById('btnBackStep3');
    const btnSubmitCreate = document.getElementById('btnCreateCommunitySubmit');
    const btnGoToComm = document.getElementById('btnGoToCommunity');
    const btnNextSteps = document.getElementById('btnViewNextSteps');

    // Topic Selection
    topicPills.forEach(pill => {
        pill.onclick = () => {
            topicPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            selectedTopic = pill.getAttribute('data-topic');
            btnNext1?.classList.add('active');
        };
    });

    // Type Selection
    typeCards.forEach(card => {
        card.onclick = () => {
            typeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('.type-radio');
            if (radio) radio.checked = true;
            communityType = radio?.value || 'Public';
        };
    });

    // Name & Desc Live Input Preview
    if (nameInput) {
        nameInput.oninput = () => {
            const val = nameInput.value.trim();
            communityName = val;
            if (nameCharCount) nameCharCount.textContent = `${val.length}/21`;
            if (previewName) previewName.textContent = val ? `r/${val}` : 'r/communityname';

            if (val.length >= 3) {
                btnSubmitCreate?.classList.add('active');
            } else {
                btnSubmitCreate?.classList.remove('active');
            }
        };
    }

    if (descInput) {
        descInput.oninput = () => {
            const val = descInput.value.trim();
            communityDesc = val;
            if (descCharCount) descCharCount.textContent = `${val.length}`;
            if (previewDesc) previewDesc.textContent = val || 'Your community description';
        };
    }

    // Wizard Step Switches
    if (btnNext1) btnNext1.onclick = () => goToStep(2);
    if (btnCancel1) btnCancel1.onclick = closeModal;
    if (btnBack2) btnBack2.onclick = () => goToStep(1);
    if (btnNext2) btnNext2.onclick = () => goToStep(3);
    if (btnBack3) btnBack3.onclick = () => goToStep(2);

    if (btnSubmitCreate) {
        btnSubmitCreate.onclick = () => {
            if (!communityName || communityName.length < 3) {
                showToast('Please enter a community name (min 3 chars)');
                return;
            }
            createCommunitySuccess();
        };
    }

    if (btnGoToComm) btnGoToComm.onclick = closeModal;
    if (btnNextSteps) btnNextSteps.onclick = closeModal;

    closeBtns.forEach(btn => {
        btn.onclick = closeModal;
    });
}

export function openCommunityModal() {
    const backdrop = document.getElementById('communityModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        goToStep(1);
    }
}

function closeModal() {
    const backdrop = document.getElementById('communityModalBackdrop');
    if (backdrop) backdrop.classList.add('hidden');
}

function goToStep(stepNum) {
    currentStep = stepNum;
    for (let i = 1; i <= 5; i++) {
        const stepEl = document.getElementById(`modalStep${i}`);
        if (stepEl) {
            if (i === stepNum) stepEl.classList.add('active');
            else stepEl.classList.remove('active');
        }
    }
}

function createCommunitySuccess() {
    const nameEl = document.getElementById('celebratedCommName');
    const descEl = document.getElementById('celebratedCommDesc');
    
    if (nameEl) nameEl.textContent = `r/${communityName}`;
    if (descEl) descEl.textContent = communityDesc || 'Community launched successfully';

    // Add created community to Sidebar list!
    addCreatedCommunityToSidebar(communityName);

    goToStep(5);
    triggerConfettiAnimation();
    showToast(`Successfully created r/${communityName}! 🎉`);
}

function addCreatedCommunityToSidebar(name) {
    const sidebarDrawer = document.getElementById('sidebarAuthedDrawer');
    if (!sidebarDrawer) return;

    // Find or append to COMMUNITIES section
    let commSection = sidebarDrawer.querySelector('.drawer-accordion:nth-of-type(4)');
    if (commSection) {
        const newLink = document.createElement('a');
        newLink.className = 'drawer-nav-item sub-item';
        newLink.href = '#';
        newLink.innerHTML = `<span class="game-avatar">r/</span><span>r/${name}</span>`;
        commSection.appendChild(newLink);
    }
}

function triggerConfettiAnimation() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FF4500', '#2563EB', '#16A34A', '#F43F5E', '#F59E0B', '#8B5CF6'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 6,
            h: Math.random() * 16 + 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotSpeed: Math.random() * 4 - 2
        });
    }

    let animationFrame;
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;

        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;

            if (p.y < canvas.height) activeCount++;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        if (activeCount > 0) {
            animationFrame = requestAnimationFrame(render);
        } else {
            canvas.classList.add('hidden');
        }
    }

    render();
    setTimeout(() => {
        cancelAnimationFrame(animationFrame);
        canvas.classList.add('hidden');
    }, 4000);
}
