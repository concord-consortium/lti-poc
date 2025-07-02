export const gradingDemo = async (lti: any, req: any, res: any, token: any) => {
  const gradeLineItems  = await lti.Grade.getLineItems(token)
  return res.send(`
    <h2>Raw Grade Line Items</h2>
    <pre>${JSON.stringify(gradeLineItems, null, 2)}</pre>

    <form action="/grade" method="POST">
      <input type="hidden" name="ltik" value="${req.token}" />
      <label for="activityProgress">Activity Progress:</label>
      <select name="activityProgress" id="activityProgress">
        <option value="Initialized">Initialized</option>
        <option value="Started">Started</option>
        <option value="In Progress">In Progress</option>
        <option value="Submitted">Submitted</option>
        <option value="Completed">Completed</option>
      </select>
      <input type="submit" value="Update Activity Progress" />
    </form>

    <p>
      NOTE: the activity progress change does get saved in Moodle, but we should test it in other LMSs.
    </p>
  `);

}
