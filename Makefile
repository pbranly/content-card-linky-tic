version=
ifneq ($(version),)
$(eval VERSION=$(version))
endif

commit_msg=
ifneq ($(commit_msg),)
$(eval COMMIT_MSG=$(commit_msg))
endif


define check_version
	if [ -z "$(VERSION)" ]; then echo "Version paramater is mandatory (ex : make run app=pagerduty)"; exit; fi
endef
define check_commit
	if [ -z "$(COMMIT_MSG)" ]; then echo "Commit msg paramater is mandatory (ex : make run app=pagerduty)"; exit; fi
endef


.ONESHELL:

create-release:
	@$(call check_version)
	@$(call check_commit)
	git add --all; 	git commit -m "$(commit_msg)"; git push origin dev; hh release delete $(VERSION) -y; git tag -d $(VERSION); git push --delete origin $(VERSION); git tag $(VERSION); git push origin $(VERSION); gh release create -t $(VERSION) --generate-notes --prerelease $(VERSION)