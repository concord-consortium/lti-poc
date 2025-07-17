import { clients } from "./catalog/clients"
import { allResources } from "./catalog/resources"
import { publicUrl } from "./config"

// these are routes that our LTI tool exposes

export const addApiRoutes = (lti: any) => {
  lti.app.get('/resources', async (req, res) => {
    const idToken = res.locals.token
    const client = clients.find(c => c.id === idToken.clientId)
    if (!client) {
      return res.status(404).send({ status: 404, error: 'Not Found', details: { message: 'Client not found.' } })
    }

    const clientResources = client.tags === "*" ? allResources : allResources.filter(r => r.tags.some(t => client.tags.includes(t)))
    return res.status(200).send(clientResources);
  })

  lti.app.post('/deeplink', async (req, res) => {
    const resource = req.body

    const items = [
      {
        type: 'ltiResourceLink',
        title: resource.title,
        url: `${publicUrl}/launch`,
        custom: {
          slug: resource.slug
        }
      }
    ]

    // Creates the deep linking request form
    const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully registered resource!' })

    return res.send(form)
  })

  lti.app.post('/grade', async (req, res) => {
    const {activityProgress} = req.body;
    if (!activityProgress) {
      return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing required fields: activityProgress.' } });
    }
    const idToken = res.locals.token

    const gradeObj = {
      userId: idToken.user,
      scoreGiven: 99,
      scoreMaximum: 100,
      activityProgress,
      gradingProgress: 'FullyGraded',
    }

    // get or create a line item
    let lineItemId = idToken.platformContext.endpoint.lineitem
    if (!lineItemId) {
      const response = await lti.Grade.getLineItems(idToken, { resourceLinkId: true })
      const lineItems = response.lineItems
      if (lineItems.length === 0) {
        const newLineItem = {
          scoreMaximum: 100,
          label: 'Grade',
          tag: 'grade',
          resourceLinkId: idToken.platformContext.resource.id
        }
        const lineItem = await lti.Grade.createLineItem(idToken, newLineItem)
        lineItemId = lineItem.id
      } else lineItemId = lineItems[0].id
    }

    const responseGrade = await lti.Grade.submitScore(idToken, lineItemId, gradeObj)
    return res.send(responseGrade)
  });
}