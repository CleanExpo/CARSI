/**
 * GP-633 follow-up: the coach approval step.
 *
 * A path prescribed from the assessment is a DRAFT (`proposed`) until a coach approves it. The
 * member's board read (`syncLearningPath`) never shows a draft and never writes to one, the coach
 * sees drafts with `draft: true`, and approval turns every draft live in one step.
 */
import { describe, expect, it } from 'vitest';

import { LEARNING_PROPOSED_STATUS, learningGoalId } from '@/lib/coaching-portal/learning-path';
import {
  adjustLearningPath,
  approveLearningPath,
  assignLearningPathFromAssessment,
  coachLearningPath,
  syncLearningPath,
} from '@/lib/server/carsi-coaching-learning-path';
import {
  C_ADMIN,
  C_ESTIMATING,
  C_SOCIAL,
  C_WD_MKT,
  MARKETING_GAP_ASSESSMENT,
  OTHER_USER,
  USER,
  fakeStore,
} from '@/lib/server/carsi-coaching-learning-path.fixtures';

const ENROLLED_HALFWAY = { enrolled: true, completed: false, lessonsTotal: 4, lessonsCompleted: 2 };

describe('assignment creates a draft the member cannot see', () => {
  it('stores the prescribed courses as proposed, not live', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    expect((await assignLearningPathFromAssessment(USER, store)).status).toBe('assigned');
    const learning = actions.filter((a) => a.goalId?.startsWith('course:'));
    expect(learning).toHaveLength(2);
    expect(learning.every((a) => a.status === LEARNING_PROPOSED_STATUS)).toBe(true);
  });

  it('the member board read returns nothing while the path is a draft', async () => {
    const { store } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    expect(await syncLearningPath(USER, store)).toEqual([]);
  });

  it('progress sync never writes to a draft, even when the member is already enrolled', async () => {
    const { store, actions, writes } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      progress: { [C_SOCIAL]: ENROLLED_HALFWAY },
    });
    await assignLearningPathFromAssessment(USER, store);
    const before = writes.length;
    await syncLearningPath(USER, store);
    expect(writes.length).toBe(before);
    expect(actions.find((a) => a.goalId === learningGoalId(C_SOCIAL))?.status).toBe(
      LEARNING_PROPOSED_STATUS
    );
  });

  it('a second assignment does not add to a waiting draft', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    const before = actions.length;
    expect((await assignLearningPathFromAssessment(USER, store)).status).toBe('already_assigned');
    expect(actions.length).toBe(before);
  });
});

describe('the coach sees the draft', () => {
  it('lists draft courses with draft: true and their LMS progress', async () => {
    const { store } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      progress: { [C_SOCIAL]: ENROLLED_HALFWAY },
    });
    await assignLearningPathFromAssessment(USER, store);
    const path = await coachLearningPath(USER, store);
    expect(path.map((p) => [p.courseId, p.draft])).toEqual([
      [C_SOCIAL, true],
      [C_WD_MKT, true],
    ]);
    expect(path[0].percent).toBe(50);
  });
});

describe('approveLearningPath', () => {
  it('turns every draft course live, then the member sees it with real progress', async () => {
    const { store, actions } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      progress: { [C_SOCIAL]: ENROLLED_HALFWAY },
    });
    await assignLearningPathFromAssessment(USER, store);
    const res = await approveLearningPath(USER, store);
    expect(res.approved).toBe(2);
    const member = await syncLearningPath(USER, store);
    expect(member.map((m) => [m.courseId, m.status])).toEqual([
      [C_SOCIAL, 'in_progress'],
      [C_WD_MKT, 'todo'],
    ]);
    expect(actions.some((a) => a.status === LEARNING_PROPOSED_STATUS)).toBe(false);
    expect((await coachLearningPath(USER, store)).every((p) => !p.draft)).toBe(true);
  });

  it('only approves this member: another member’s draft stays a draft', async () => {
    const { store, actions } = fakeStore({
      actions: [
        {
          id: 'other-draft',
          userId: OTHER_USER,
          title: 'Other',
          goalId: learningGoalId(C_ADMIN),
          status: LEARNING_PROPOSED_STATUS,
          sortOrder: 0,
        },
        {
          id: 'mine-draft',
          userId: USER,
          title: 'Mine',
          goalId: learningGoalId(C_SOCIAL),
          status: LEARNING_PROPOSED_STATUS,
          sortOrder: 0,
        },
      ],
    });
    await approveLearningPath(USER, store);
    expect(actions.find((a) => a.id === 'other-draft')?.status).toBe(LEARNING_PROPOSED_STATUS);
    expect(actions.find((a) => a.id === 'mine-draft')?.status).toBe('todo');
  });

  it('with no draft waiting it writes nothing', async () => {
    const { store, writes } = fakeStore({
      actions: [
        {
          id: 'live',
          userId: USER,
          title: 'Live',
          goalId: learningGoalId(C_SOCIAL),
          status: 'todo',
          sortOrder: 0,
        },
      ],
    });
    expect((await approveLearningPath(USER, store)).approved).toBe(0);
    expect(writes).toEqual([]);
  });

  it('never revives a course the coach removed from the draft', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    await adjustLearningPath(USER, { removeCourseIds: [C_SOCIAL] }, store);
    await approveLearningPath(USER, store);
    expect(actions.find((a) => a.goalId === learningGoalId(C_SOCIAL))?.status).toBe('removed');
    expect((await syncLearningPath(USER, store)).map((m) => m.courseId)).toEqual([C_WD_MKT]);
  });
});

describe('coach edits keep the draft a draft', () => {
  it('a course added while the path is a draft joins the draft', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    await adjustLearningPath(USER, { addCourseIds: [C_ADMIN] }, store);
    expect(actions.find((a) => a.goalId === learningGoalId(C_ADMIN))?.status).toBe(
      LEARNING_PROPOSED_STATUS
    );
    expect(await syncLearningPath(USER, store)).toEqual([]);
  });

  it('reordering a draft keeps every course a draft', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    const path = await adjustLearningPath(USER, { orderCourseIds: [C_WD_MKT, C_SOCIAL] }, store);
    expect(path.map((p) => p.courseId)).toEqual([C_WD_MKT, C_SOCIAL]);
    expect(path.every((p) => p.draft)).toBe(true);
    expect(
      actions.filter((a) => a.goalId?.startsWith('course:')).every((a) => a.status === 'proposed')
    ).toBe(true);
  });

  it('re-adding a removed course during the draft revives it as a draft', async () => {
    const { store, actions } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    await adjustLearningPath(USER, { removeCourseIds: [C_SOCIAL] }, store);
    await adjustLearningPath(USER, { addCourseIds: [C_SOCIAL] }, store);
    const rows = actions.filter((a) => a.goalId === learningGoalId(C_SOCIAL));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(LEARNING_PROPOSED_STATUS);
  });

  it('once approved, a course the coach adds goes live straight away', async () => {
    const { store } = fakeStore({ assessmentJson: MARKETING_GAP_ASSESSMENT });
    await assignLearningPathFromAssessment(USER, store);
    await approveLearningPath(USER, store);
    await adjustLearningPath(USER, { addCourseIds: [C_ESTIMATING] }, store);
    expect((await syncLearningPath(USER, store)).map((m) => m.courseId)).toEqual([
      C_SOCIAL,
      C_WD_MKT,
      C_ESTIMATING,
    ]);
  });

  it('a path the coach builds by hand (no assessment draft) is live', async () => {
    const { store } = fakeStore({});
    await adjustLearningPath(USER, { addCourseIds: [C_ADMIN] }, store);
    expect((await syncLearningPath(USER, store)).map((m) => m.courseId)).toEqual([C_ADMIN]);
  });
});
