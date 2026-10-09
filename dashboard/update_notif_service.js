const fs = require('fs');
let content = fs.readFileSync('src/lib/services/notification.ts', 'utf8');

const oldSub = `const q = query(
      notificationsRef,
      where('read', '==', false)
    );`;

const newSub = `const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );`;

content = content.replace(oldSub, newSub);

// Also add a deleteAll function if needed, or just let users delete individually.
// The user asked "ami jotokhon na clear korbo...". We can add a "Clear all" button in Topbar that deletes them.
const oldMarkAll = `async markAllAsRead(ids: string[]) {
    if (!db) return;
    const promises = ids.map(id => updateDoc(doc(db, COLLECTION_NAME, id), { read: true }));
    await Promise.all(promises);
  },`;

const newMarkAll = `async markAllAsRead(ids: string[]) {
    if (!db) return;
    const promises = ids.map(id => updateDoc(doc(db, COLLECTION_NAME, id), { read: true }));
    await Promise.all(promises);
  },

  async clearAll(ids: string[]) {
    if (!db) return;
    const promises = ids.map(id => deleteDoc(doc(db, COLLECTION_NAME, id)));
    await Promise.all(promises);
  },`;

content = content.replace(oldMarkAll, newMarkAll);

fs.writeFileSync('src/lib/services/notification.ts', content);
console.log('notificationService updated');
