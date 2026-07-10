from app.models.feed import FeedTransaction
from app.models.feeding_batch import FeedingBatch, FeedingBatchIngredient
from app.models.task import TaskExecution
from app.models.timbangan import TimbanganReading, TimbanganRequest
from app.service import feeding_batch_service, task_service
from app.utils.db import db


def _create_planned_batch(context):
    response, code = feeding_batch_service.create_batch(
        context['keeper'].id,
        context['date'],
        context['task'].id,
        context['execution'].id,
    )
    assert code == 201
    batch = FeedingBatch.query.get(response['data']['id'])
    assert batch is not None
    assert len(batch.ingredients) == 1
    return batch


def _send_scale_phase(context, batch, request_id='scale-phase-request-0001', value=1.0):
    item = batch.ingredients[0]
    return feeding_batch_service.record_scale_readings_bulk({
        'request_id': request_id,
        'batch_id': batch.id,
        'timbangan_id': 2,
        'mode': 'SET',
        'unit': 'kg',
        'items': [{
            'ingredient_id': item.id,
            'phase': item.phase,
            'phase_id': item.phase_id,
            'label': item.feed_name,
            'value': value,
        }],
    })


def test_end_to_end_batch_is_idempotent_and_completes_task(app, seeded_batch_context):
    context = seeded_batch_context
    batch = _create_planned_batch(context)

    first_response, first_code = _send_scale_phase(context, batch)
    replay_response, replay_code = _send_scale_phase(context, batch)

    assert first_code == 200
    assert replay_code == 200
    assert replay_response['idempotent_replay'] is True
    assert TimbanganReading.query.count() == 1
    assert TimbanganRequest.query.count() == 1

    final_response, final_code = feeding_batch_service.finalize_batch(batch.id, context['keeper'].id)
    replay_final, replay_final_code = feeding_batch_service.finalize_batch(batch.id, context['keeper'].id)

    assert final_code == 200
    assert final_response['status'] == 'success'
    assert replay_final_code == 200
    assert replay_final['idempotent_replay'] is True
    assert context['feed'].stock == 9.0
    assert FeedTransaction.query.count() == 1

    task_response, task_code = task_service.toggle_task_execution(
        context['task'].id,
        context['date'],
        context['keeper'].id,
        True,
    )
    assert task_code == 200
    assert task_response['data']['is_completed'] is True
    assert TaskExecution.query.get(context['execution'].id).is_completed is True


def test_out_of_tolerance_is_warning_not_blocker(app, seeded_batch_context):
    context = seeded_batch_context
    batch = _create_planned_batch(context)
    response, code = _send_scale_phase(context, batch, 'scale-phase-request-warning', value=0.2)
    assert code == 200
    assert response['status'] == 'success'

    final_response, final_code = feeding_batch_service.finalize_batch(batch.id, context['keeper'].id)
    assert final_code == 200
    assert final_response['warning']['code'] == 'WEIGHT_OUT_OF_TOLERANCE'
    assert context['feed'].stock == 9.8


def test_insufficient_stock_does_not_finalize_or_deduct(app, seeded_batch_context):
    context = seeded_batch_context
    context['feed'].stock = 0.5
    db.session.commit()
    batch = _create_planned_batch(context)
    response, code = _send_scale_phase(context, batch, 'scale-phase-request-stock', value=1.0)
    assert code == 200
    assert response['status'] == 'success'

    final_response, final_code = feeding_batch_service.finalize_batch(batch.id, context['keeper'].id)
    assert final_code == 400
    assert final_response['code'] == 'INSUFFICIENT_FEED_STOCK'
    assert context['feed'].stock == 0.5
    assert FeedTransaction.query.count() == 0
    assert FeedingBatch.query.get(batch.id).status == 'READY_TO_FINALIZE'


def test_cancel_reverses_finalized_stock_once(app, seeded_batch_context):
    context = seeded_batch_context
    batch = _create_planned_batch(context)
    _send_scale_phase(context, batch, 'scale-phase-request-cancel', value=1.0)
    feeding_batch_service.finalize_batch(batch.id, context['keeper'].id)

    first_response, first_code = feeding_batch_service.cancel_batch(batch.id, context['keeper'].id)
    second_response, second_code = feeding_batch_service.cancel_batch(batch.id, context['keeper'].id)

    assert first_code == 200
    assert second_code == 200
    assert first_response['data']['status'] == 'CANCELLED'
    assert second_response['idempotent_replay'] is True
    assert context['feed'].stock == 10.0
    assert FeedTransaction.query.count() == 0
    ingredient = FeedingBatchIngredient.query.filter_by(batch_id=batch.id).first()
    assert ingredient.deducted_amount == 0.0
