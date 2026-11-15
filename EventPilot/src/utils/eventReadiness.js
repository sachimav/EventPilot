export function calculateReadiness(completedTasks, totalTasks) {
    if (!Number.isSafeInteger(totalTasks) || !Number.isSafeInteger(completedTasks)
        || completedTasks < 0 || totalTasks < 0 || completedTasks > totalTasks) {
        throw new Error('Readiness requires valid completed and total task counts.');
    }
    return { completedTasks, totalTasks, percentage: totalTasks === 0 ? null : completedTasks / totalTasks * 100 };
}
export function readinessForEvent(eventId, tasks) {
    let completed = 0;
    let total = 0;
    for (const task of tasks) {
        if (task.event_id !== eventId)
            continue;
        total += 1;
        if (task.completed === 1)
            completed += 1;
    }
    return calculateReadiness(completed, total);
}
/** One pass for Dashboard; events absent from the map have no tasks. */
export function readinessByEvent(tasks) {
    const counts = new Map();
    for (const task of tasks) {
        const count = counts.get(task.event_id) ?? { completed: 0, total: 0 };
        count.total += 1;
        if (task.completed === 1)
            count.completed += 1;
        counts.set(task.event_id, count);
    }
    return new Map([...counts].map(([id, count]) => [id, calculateReadiness(count.completed, count.total)]));
}
