import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, daysRemaining } from '../src/server.js';

test('distance is zero for same coordinates', () => assert.equal(distanceKm(34,74,34,74), 0));
test('distance is symmetric', () => assert.ok(Math.abs(distanceKm(34,74,35,75)-distanceKm(35,75,34,74)) < 1e-9));
test('distance is approximately correct', () => assert.ok(distanceKm(34.0837,74.7973,34.09,74.80) < 1));
test('days remaining rounds up', () => assert.equal(daysRemaining(12, 2), 6));
test('days remaining returns zero for empty stock', () => assert.equal(daysRemaining(0, 2), 0));
test('days remaining guards invalid dose rate', () => assert.equal(daysRemaining(10, 0), 0));