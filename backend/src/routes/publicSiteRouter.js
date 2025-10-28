import express from 'express';

// هذا الراوتر مسؤول عن الداتا للموقع العام (Future Systems):
// - الخدمات (talent acquisition, remote workforce, AI automation…)
// - الSEO Booster: جو بقدر يعدل الميتا داتا/الوصف/الكلمات المفتاحية

export function publicSiteRouter(initMongo) {
  const router = express.Router();

  router.get('/services', async (req, res) => {
    // هاي نسخة ابتدائية ثابتة من الخدمات اللي وصفتها
    return res.json({
      ok: true,
      services: [
        {
          id: "talent",
          title: "Talent Acquisition & Headhunting",
          desc: "We identify and secure top-tier technical and leadership talent for your organization. Our headhunting model ensures you get highly qualified professionals who align with your culture, role requirements, and long-term vision."
        },
        {
          id: "remote",
          title: "Remote Workforce Solutions",
          desc: "We provide companies with trusted, pre-vetted remote IT professionals who are ready to deliver results from day one. This includes developers, QA engineers, DevOps specialists, product managers, and more."
        },
        {
          id: "consult",
          title: "Business & Technology Consulting",
          desc: "We help organizations improve performance, optimize operations, and adopt innovative technology strategies that enhance growth, scalability, and digital transformation."
        },
        {
          id: "ai_auto",
          title: "AI Automation & Digital Transformation",
          desc: "We integrate cutting-edge AI tools, automation workflows, and intelligent systems to streamline business operations, reduce costs, and increase productivity."
        },
        {
          id: "ecom",
          title: "E-Commerce Store Setup & Management",
          desc: "We design, develop, and manage high-performance online stores optimized for sales, user experience, and client conversion."
        },
        {
          id: "web_lp",
          title: "Website & Landing Page Development",
          desc: "We create custom websites and landing pages that are visually strong, mobile-responsive, and conversion-optimized to support your business objectives."
        },
        {
          id: "saas",
          title: "Digital Products & SaaS Development",
          desc: "We conceptualize and build custom digital solutions and SaaS platforms, including AI tools, automation systems, and client-facing applications."
        },
        {
          id: "training",
          title: "Training & Upskilling Programs",
          desc: "We offer specialized training and workshops in AI tools, automation, leadership, and remote workforce management to empower teams with future-ready skills."
        }
      ]
    });
  });

  // جو يحسّن الSEO
  router.post('/seo-boost', async (req, res) => {
    // مثال:
    // {
    //   "sessionToken":"...",
    //   "targetPage":"landing",
    //   "keywords":["ai automation","future systems consulting",...]
    // }
    //
    // worker/joe راح يستخدمها ليعمل خطّة SEO ويولد ميتا تاجز وتركيبة محتوى
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