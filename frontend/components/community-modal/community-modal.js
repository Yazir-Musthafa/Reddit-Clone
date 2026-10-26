import { showToast } from '../../js/interactions.js';
import { api } from '../../js/api.js';
import { authState } from '../../js/auth-state.js';
import { requireLogin } from '../../js/ui.js';
import { debounce } from '../../js/utils.js';

const wizard = {
    topic: '',
    type: 'Public',
    mature: false,
    name: '',
    description: '',
    nameAvailable: false,
    created: null
};

export function initCommunityModal() {
    const byId = (id) => document.getElementById(id);
    const topicPills = document.querySelectorAll('.topic-pill');
    const typeCards = document.querySelectorAll('.type-option-card');
    const nameInput = byId('commNameInput');
    const descInput = byId('commDescInput');
    const nameStatus = byId('commNameStatus');
    const btnNext1 = byId('btnNextStep1');
    const btnSubmitCreate = byId('btnCreateCommunitySubmit');
    const errorEl = byId('communityCreateError');
    if (!nameInput) return;

    const refreshCreateButton = () => {
        btnSubmitCreate.classList.toggle('active', wizard.nameAvailable && wizard.description.length > 0);
    };

    topicPills.forEach(pill => {
        pill.onclick = () => {
            topicPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            wizard.topic = pill.dataset.topic;
            btnNext1.classList.add('active');
        };
    });

    typeCards.forEach(card => {
        card.onclick = () => {
            typeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('.type-radio');
            radio.checked = true;
            wizard.type = radio.value;
        };
    });
    byId('matureToggleInput').onchange = (e) => { wizard.mature = e.target.checked; };

    const checkName = debounce(async () => {
        const value = wizard.name;
        if (value.length < 3) {
            wizard.nameAvailable = false;
            nameStatus.textContent = value ? 'Names must be at least 3 characters' : '';
            return refreshCreateButton();
        }
        try {
            const { available, message } = await api.get(`/communities/check-name?name=${encodeURIComponent(value)}`);
            if (value !== wizard.name) return;
            wizard.nameAvailable = available;
            nameStatus.textContent = available ? `r/${value} is available` : message;
            nameStatus.classList.toggle('ok', available);
        } catch {
            wizard.nameAvailable = false;
        }
        refreshCreateButton();
    }, 300);

    nameInput.oninput = () => {
        wizard.name = nameInput.value.trim().replace(/\s+/g, '_');
        byId('commNameCharCount').textContent = `${wizard.name.length}/21`;
        byId('previewCommName').textContent = wizard.name ? `r/${wizard.name}` : 'r/communityname';
        wizard.nameAvailable = false;
        refreshCreateButton();
        checkName();
    };

    descInput.oninput = () => {
        wizard.description = descInput.value.trim();
        byId('commDescCharCount').textContent = `${descInput.value.length}/500`;
        byId('previewDescText').textContent = wizard.description || 'Your community description';
        refreshCreateButton();
    };

    btnNext1.onclick = () => {
        if (!wizard.topic) return showToast('Pick a topic to continue');
        goToStep(2);
    };
    byId('btnCancelStep1').onclick = closeModal;
    byId('btnBackStep2').onclick = () => goToStep(1);
    byId('btnNextStep2').onclick = () => goToStep(3);
    byId('btnBackStep3').onclick = () => goToStep(2);

    btnSubmitCreate.onclick = async () => {
        if (!btnSubmitCreate.classList.contains('active') || btnSubmitCreate.disabled) {
            if (!wizard.description) showToast('Add a description for your community');
            return;
        }
        btnSubmitCreate.disabled = true;
        errorEl.classList.add('hidden');
        try {
            const { community } = await api.post('/communities', {
                name: wizard.name,
                description: wizard.description,
                topic: wizard.topic,
                type: wizard.type,
                mature: wizard.mature
            });
            wizard.created = community;
            authState.markJoined(community, true);
            showCelebration(community);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        } finally {
            btnSubmitCreate.disabled = false;
        }
    };

    const goToCommunity = (extra = '') => {
        if (wizard.created) window.location.href = `community.html?name=${encodeURIComponent(wizard.created.name)}${extra}`;
    };
    byId('btnGoToCommunity').onclick = () => goToCommunity();
    byId('btnViewNextSteps').onclick = () => goToCommunity('&modtools=1');
    byId('celebrationEditBtn').onclick = () => goToCommunity('&modtools=1');
    byId('celebrationIconEditBtn').onclick = () => goToCommunity('&modtools=1');

    byId('celebrationColorInput').onchange = async (e) => {
        if (!wizard.created) return;
        const color = e.target.value.toUpperCase();
        try {
            await api.patch(`/communities/${encodeURIComponent(wizard.created.name)}`, { bannerColor: color, color });
            byId('celebrationCardBg').style.backgroundColor = color;
            byId('celebrationColorDot').style.backgroundColor = color;
            showToast('Community color updated');
        } catch (err) {
            showToast(err.message);
        }
    };

    document.querySelectorAll('#btnCloseCommunityModal, .btnCloseModal').forEach(btn => {
        btn.onclick = closeModal;
    });
}

export function openCommunityModal() {
    if (!requireLogin()) return;
    const backdrop = document.getElementById('communityModalBackdrop');
    if (!backdrop) return;
    resetWizard();
    backdrop.classList.remove('hidden');
    goToStep(1);
}

function resetWizard() {
    Object.assign(wizard, { topic: '', type: 'Public', mature: false, name: '', description: '', nameAvailable: false, created: null });
    document.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('selected'));
    document.getElementById('btnNextStep1')?.classList.remove('active');
    document.querySelectorAll('.type-option-card').forEach((c, i) => {
        c.classList.toggle('active', i === 0);
        c.querySelector('.type-radio').checked = i === 0;
    });
    const set = (id, prop, value) => { const el = document.getElementById(id); if (el) el[prop] = value; };
    set('matureToggleInput', 'checked', false);
    set('commNameInput', 'value', '');
    set('commDescInput', 'value', '');
    set('commNameCharCount', 'textContent', '0/21');
    set('commDescCharCount', 'textContent', '0/500');
    set('commNameStatus', 'textContent', '');
    set('previewCommName', 'textContent', 'r/communityname');
    set('previewDescText', 'textContent', 'Your community description');
    document.getElementById('btnCreateCommunitySubmit')?.classList.remove('active');
    document.getElementById('communityCreateError')?.classList.add('hidden');
}

function closeModal() {
    document.getElementById('communityModalBackdrop')?.classList.add('hidden');
}

function goToStep(stepNum) {
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`modalStep${i}`)?.classList.toggle('active', i === stepNum);
    }
}

function showCelebration(community) {
    document.getElementById('celebratedCommName').textContent = `r/${community.name}`;
    document.getElementById('celebratedCommDesc').textContent = community.description;
    goToStep(5);
    triggerConfettiAnimation();
    showToast(`Successfully created r/${community.name}! 🎉`);
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
