#!/bin/bash
# List spot instance request information
sir=$1

if [ "$sir" == "all" ]; then
	for region in ${AWS_REGION}; do
		echo "-------------------------------------"
		echo "Region: $region"
		echo ""
		for awsprofile in ${AWS_PROFILE}; do
			echo "Bidding configurations of profile $awsprofile"
			lcs=`aws --profile $awsprofile --region $region autoscaling describe-launch-configurations | jq -r .LaunchConfigurations[].LaunchConfigurationName | grep SPOT`
			for lc in $lcs; do
				lcinfo=`echo $lc | cut -d'+' -f1-2`
				env=`echo $lc | cut -d'+' -f2`
				instance=`echo $lcinfo | cut -d'-' -f2`
				price=`echo $lc | cut -d'+' -f1 | cut -d'-' -f3`
				echo "$env $instance $price"
			done
			echo ""
			echo "Spot request status:"
			aws --profile $awsprofile --region $region ec2 describe-spot-instance-requests | jq -r '.SpotInstanceRequests[] | "ID: \(.SpotInstanceRequestId), Status: \(.Status.Code), Description: \(.Status.Message)"'
			echo ""
		done
	done
fi


	