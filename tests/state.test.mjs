import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postReducer } from '../frontend/react/postState.mjs';
import { validateAccount, validateProfile } from '../frontend/react/forms/validation.mjs';

test('all vote transitions preserve the original snapshot and use net score changes', () => {
    for (const oldVote of [-1, 0, 1]) {
        for (const nextVote of [-1, 0, 1]) {
            const original = Object.freeze({ id: 'post', score: 10, userVote: oldVote, saved: false });
            const next = postReducer(original, { type: 'vote', direction: nextVote });
            assert.equal(next.userVote, nextVote);
            assert.equal(next.score - nextVote, original.score - oldVote);
            assert.equal(original.score, 10);
            assert.notEqual(next, original);
        }
    }
});

test('rolling back a vote preserves an independent save operation', () => {
    const original = Object.freeze({ score: 10, userVote: 0, saved: false });
    const voted = postReducer(original, { type: 'vote', direction: 1 });
    const saved = postReducer(voted, { type: 'patch', changes: { saved: true } });
    const rolledBack = postReducer(saved, { type: 'patch', changes: { score: original.score, userVote: original.userVote } });
    assert.deepEqual(rolledBack, { score: 10, userVote: 0, saved: true });
    assert.equal(original.saved, false);
});

test('account validation handles empty fields, malformed email and password boundaries', () => {
    assert.ok(validateAccount('email', { email: '  ', password: '' }).email);
    assert.ok(validateAccount('email', { email: 'wrong@', password: 'password123' }).email);
    assert.deepEqual(validateAccount('email', { email: ' person@example.com ', password: 'password123' }), {});
    const values = { currentPassword: 'old-password', newPassword: '1234567', confirmPassword: '1234567' };
    assert.ok(validateAccount('password', values).newPassword);
    assert.deepEqual(validateAccount('password', { ...values, newPassword: '12345678', confirmPassword: '12345678' }), {});
    assert.ok(validateAccount('password', { ...values, confirmPassword: 'different' }).confirmPassword);
    assert.ok(validateAccount('delete', { password: '' }).password);
});

test('profile validation accepts limits and rejects oversized input', () => {
    assert.deepEqual(validateProfile({ displayName: 'a'.repeat(30), bio: 'b'.repeat(200) }), {});
    const errors = validateProfile({ displayName: 'a'.repeat(31), bio: 'b'.repeat(201) });
    assert.ok(errors.displayName); assert.ok(errors.bio);
});
