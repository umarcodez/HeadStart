const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const eventService = require('../services/eventService');
const { ValidationError } = require('../utils/errors');

// Event Categories
router.get('/categories', authenticate, async (req, res, next) => {
    try {
        const categories = await eventService.getEventCategories();
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// Event Tags
router.get('/tags', authenticate, async (req, res, next) => {
    try {
        const tags = await eventService.getEventTags();
        res.json(tags);
    } catch (error) {
        next(error);
    }
});

router.post('/tags', authenticate, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            throw new ValidationError('Tag name is required');
        }
        const tag = await eventService.createEventTag(name);
        res.status(201).json(tag);
    } catch (error) {
        next(error);
    }
});

// Events
router.get('/', authenticate, async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            categoryId,
            tags,
            isPublic,
            status
        } = req.query;

        const events = await eventService.getEvents({
            startDate,
            endDate,
            categoryId,
            tags: tags ? tags.split(',') : undefined,
            isPublic: isPublic === 'true',
            status
        });

        res.json(events);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const event = await eventService.getEventById(req.params.id);
        res.json(event);
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const {
            title,
            description,
            location,
            startDate,
            endDate,
            categoryId,
            isPublic,
            maxParticipants,
            registrationDeadline,
            tags
        } = req.body;

        if (!title || !startDate || !endDate) {
            throw new ValidationError('Title, start date, and end date are required');
        }

        const event = await eventService.createEvent({
            title,
            description,
            location,
            startDate,
            endDate,
            categoryId,
            createdBy: req.user.user_id,
            isPublic,
            maxParticipants,
            registrationDeadline,
            tags
        });

        res.status(201).json(event);
    } catch (error) {
        next(error);
    }
});

router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const {
            title,
            description,
            location,
            startDate,
            endDate,
            categoryId,
            isPublic,
            maxParticipants,
            registrationDeadline,
            status,
            tags
        } = req.body;

        const event = await eventService.updateEvent(req.params.id, {
            title,
            description,
            location,
            startDate,
            endDate,
            categoryId,
            isPublic,
            maxParticipants,
            registrationDeadline,
            status,
            tags
        });

        res.json(event);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await eventService.deleteEvent(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Event Registration
router.post('/:id/register', authenticate, async (req, res, next) => {
    try {
        const { notes } = req.body;
        const event = await eventService.registerForEvent(
            req.params.id,
            req.user.user_id,
            notes
        );
        res.json(event);
    } catch (error) {
        next(error);
    }
});

router.put('/:id/registration-status', authenticate, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status || !['registered', 'attended', 'cancelled'].includes(status)) {
            throw new ValidationError('Valid status is required');
        }

        const event = await eventService.updateRegistrationStatus(
            req.params.id,
            req.user.user_id,
            status
        );
        res.json(event);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id/register', authenticate, async (req, res, next) => {
    try {
        await eventService.cancelRegistration(req.params.id, req.user.user_id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 