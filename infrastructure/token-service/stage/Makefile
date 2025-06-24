.EXPORT_ALL_VARIABLES:
AWS_DEFAULT_REGION = ap-southeast-2

install:
	@pip install -r deps/requirements-test.txt

test:
	@python -m unittest token_service/cognitor/tests.py

local:
	@mkdir -p .local

template: local
	@pnpm -s cdk-token-service synth -e OrcaBusTokenServiceStack/Pipeline/OrcaBusBeta/TokenServiceStack > .local/template.yml

# see cfn-lint doc
# https://github.com/aws-cloudformation/cfn-lint#exit-codes
# https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/rules.md
lint:
	@cfn-lint --non-zero-exit-code error .local/template.yml

code:
	@code .local/template.yml

stack: template lint code
