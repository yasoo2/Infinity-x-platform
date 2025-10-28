import express from 'express';

export function publicSiteRouter(initMongo) {
  const router = express.Router();

  router.get('/services', async (req, res) => {
    return res.json({
      ok: true,
      services: [
        {
          id: "talent",
          title: "Talent Acquisition & Headhunting",
          desc: "We identify and secure top-tier technical and leadership 
talent for your organization."
        },
        {
          id: "remote",
          title: "Remote Workforce Solutions",
          desc: "Pre-vetted remote IT professionals: developers, QA, 
DevOps, PMs and more."
        },
        {
          id: "consult",
          title: "Business & Technology Consulting",
          desc: "We optimize operations, scalability, and transformation 
strategy."
        },
        {
          id: "ai_auto",
          title: "AI Automation & Digital Transformation",
          desc: "We deploy intelligent systems to reduce cost and boost 
productivity."
        },
        {
          id: "ecom",
          title: "E-Commerce Store Setup & Management",
          desc: "High-performance online stores built for sales and 
conversion."
        },
        {
          id: "web_lp",
          title: "Website & Landing Page Development",
          desc: "Custom landing pages and sites that convert and look 
world-class."
        },
        {
          id: "saas",
          title: "Digital Products & SaaS Development",
          desc: "We build proprietary AI tools and platforms for you or 
with you."
        },
        {
          id: "training",
          title: "Training & Upskilling Programs",
          desc: "Leadership, AI tools, automation, future-ready team 
development."
        }
      ]
    });
  });

  router.post('/seo-boost', async (req, res) => {
    try {
      const { sessionToken, targetPage, keywords } = req.body;
      if (!sessionToken || !targetPage) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const db = await initMongo();
      const now = new Date();
      const ins = await db.collection('seo_tasks').insertOne({
        createdAt: now,
        sessionToken,
        page: targetPage,
        keywords: keywords || [],
        status: 'QUEUED'
      });

      await db.collection('joe_activity').insertOne({
        ts: now,
        action: 'SEO_REQUEST',
        detail: `page=${targetPage}`
      });

      return res.json({
        ok: true,
        taskId: ins.insertedId.toString(),
        msg: 'SEO_TASK_QUEUED'
      });
    } catch (err) {
      console.error('/api/public-site/seo-boost err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  return router;
}
