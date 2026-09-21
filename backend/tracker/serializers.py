from rest_framework import serializers

from .models import JobApplication


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = [
            'id', 'company', 'position', 'status', 'applied_date',
            'job_url', 'notes', 'created_at', 'updated_at',
        ]
        # owner is intentionally excluded from `fields` entirely (not just
        # read_only) so it can never be set via the request payload, even if
        # someone tries to slip an "owner" key into the JSON body. The view
        # sets it explicitly from request.user in perform_create().
        read_only_fields = ['id', 'created_at', 'updated_at']
