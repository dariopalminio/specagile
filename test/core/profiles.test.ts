import { describe, it, expect } from 'vitest';

import {
  CORE_WORKFLOWS,
  ALL_WORKFLOWS,
  getProfileWorkflows,
} from '../../src/core/profiles.js';

describe('profiles', () => {
  describe('CORE_WORKFLOWS', () => {
    it('should contain the default core workflows', () => {
      expect(CORE_WORKFLOWS).toEqual([
        'propose', 'explore', 'specify', 'plan', 'tasks', 'apply', 'update', 'sync', 'archive',
      ]);
    });

    it('should include the specify, plan and tasks stages next to the one-step propose', () => {
      expect(CORE_WORKFLOWS).toHaveLength(9);
      expect(CORE_WORKFLOWS).toContain('propose');
      expect(CORE_WORKFLOWS).toContain('specify');
      expect(CORE_WORKFLOWS).toContain('plan');
      expect(CORE_WORKFLOWS).toContain('tasks');
      expect(CORE_WORKFLOWS.indexOf('tasks')).toBe(CORE_WORKFLOWS.indexOf('plan') + 1);
    });

    it('should include update in the core profile (default install, not expanded-only)', () => {
      expect(CORE_WORKFLOWS).toContain('update');
    });

    it('should be a subset of ALL_WORKFLOWS', () => {
      for (const workflow of CORE_WORKFLOWS) {
        expect(ALL_WORKFLOWS).toContain(workflow);
      }
    });
  });

  describe('ALL_WORKFLOWS', () => {
    it('should contain all 15 workflows', () => {
      expect(ALL_WORKFLOWS).toHaveLength(15);
    });

    it('should contain expected workflow IDs', () => {
      const expected = [
        'propose', 'explore', 'specify', 'plan', 'tasks', 'new', 'continue', 'apply', 'update',
        'ff', 'sync', 'archive', 'bulk-archive', 'verify', 'onboard',
      ];
      expect([...ALL_WORKFLOWS]).toEqual(expected);
    });
  });

  describe('getProfileWorkflows', () => {
    it('should return core workflows for core profile', () => {
      const result = getProfileWorkflows('core');
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return core workflows for core profile even if customWorkflows provided', () => {
      const result = getProfileWorkflows('core', ['new', 'apply']);
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return custom workflows for custom profile', () => {
      const customWorkflows = ['explore', 'new', 'apply', 'ff'];
      const result = getProfileWorkflows('custom', customWorkflows);
      expect(result).toEqual(customWorkflows);
    });

    it('should include sync when a custom profile selects archive', () => {
      const result = getProfileWorkflows('custom', ['propose', 'explore', 'apply', 'archive']);
      expect(result).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    });

    it('should include sync when a custom profile selects bulk archive', () => {
      const result = getProfileWorkflows('custom', ['explore', 'bulk-archive']);
      expect(result).toEqual(['explore', 'sync', 'bulk-archive']);
    });

    it('should not duplicate or reorder an existing sync dependency', () => {
      const workflows = ['sync', 'archive', 'bulk-archive'];
      const result = getProfileWorkflows('custom', workflows);

      expect(result).toEqual(workflows);
      expect(result).toBe(workflows);
    });

    it('should not mutate the custom workflow selection when adding sync', () => {
      const workflows = ['archive', 'bulk-archive'];
      const result = getProfileWorkflows('custom', workflows);

      expect(result).toEqual(['sync', 'archive', 'bulk-archive']);
      expect(workflows).toEqual(['archive', 'bulk-archive']);
    });

    it('should return empty array for custom profile with no customWorkflows', () => {
      const result = getProfileWorkflows('custom');
      expect(result).toEqual([]);
    });

    it('should return empty array for custom profile with empty customWorkflows', () => {
      const result = getProfileWorkflows('custom', []);
      expect(result).toEqual([]);
    });
  });
});
